import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type CreateSalesTransactionInput, type TransactionWithItems } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export async function createSalesTransaction(input: CreateSalesTransactionInput): Promise<TransactionWithItems> {
  try {
    // Use database transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Step 1: Get all product IDs from the input
      const productIds = input.items.map(item => item.product_id);
      
      // Step 2: Fetch all products to validate existence and check stock
      const products = await tx.select()
        .from(productsTable)
        .where(inArray(productsTable.id, productIds))
        .execute();

      // Check if all products exist
      if (products.length !== productIds.length) {
        const foundIds = products.map(p => p.id);
        const missingIds = productIds.filter(id => !foundIds.includes(id));
        throw new Error(`Products not found: ${missingIds.join(', ')}`);
      }

      // Create a map for quick product lookup
      const productMap = new Map(products.map(p => [p.id, p]));

      // Step 3: Validate stock availability and calculate totals
      let totalAmount = 0;
      const transactionItems: Array<{
        product_id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
      }> = [];

      for (const item of input.items) {
        const product = productMap.get(item.product_id)!;
        
        // Check stock availability
        if (product.stock_quantity < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.name}". Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
        }

        const unitPrice = parseFloat(product.price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        transactionItems.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal: subtotal
        });
      }

      // Step 4: Create the sales transaction
      const [transaction] = await tx.insert(salesTransactionsTable)
        .values({
          total_amount: totalAmount.toString(),
          notes: input.notes || null
        })
        .returning()
        .execute();

      // Step 5: Create transaction items
      const transactionItemsData = transactionItems.map(item => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price.toString(),
        subtotal: item.subtotal.toString()
      }));

      const createdItems = await tx.insert(salesTransactionItemsTable)
        .values(transactionItemsData)
        .returning()
        .execute();

      // Step 6: Update product stock quantities
      for (const item of input.items) {
        const product = productMap.get(item.product_id)!;
        const newStockQuantity = product.stock_quantity - item.quantity;
        
        await tx.update(productsTable)
          .set({ 
            stock_quantity: newStockQuantity,
            updated_at: new Date()
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }

      // Step 7: Return complete transaction with items
      return {
        id: transaction.id,
        transaction_date: transaction.transaction_date,
        total_amount: parseFloat(transaction.total_amount),
        notes: transaction.notes,
        created_at: transaction.created_at,
        items: createdItems.map(item => ({
          id: item.id,
          transaction_id: item.transaction_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal),
          created_at: item.created_at
        }))
      };
    });
  } catch (error) {
    console.error('Sales transaction creation failed:', error);
    throw error;
  }
}