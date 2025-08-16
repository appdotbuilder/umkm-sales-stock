import { db } from '../db';
import { salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type TransactionWithItems } from '../schema';
import { desc, eq } from 'drizzle-orm';

export async function getSalesTransactions(): Promise<TransactionWithItems[]> {
  try {
    // Query all transactions with their items using a join
    const results = await db.select()
      .from(salesTransactionsTable)
      .leftJoin(
        salesTransactionItemsTable,
        eq(salesTransactionsTable.id, salesTransactionItemsTable.transaction_id)
      )
      .orderBy(desc(salesTransactionsTable.transaction_date))
      .execute();

    // Group results by transaction ID to build the nested structure
    const transactionsMap = new Map<number, TransactionWithItems>();

    for (const result of results) {
      const transaction = result.sales_transactions;
      const item = result.sales_transaction_items;

      // Initialize transaction if not already in map
      if (!transactionsMap.has(transaction.id)) {
        transactionsMap.set(transaction.id, {
          id: transaction.id,
          transaction_date: transaction.transaction_date,
          total_amount: parseFloat(transaction.total_amount), // Convert numeric to number
          notes: transaction.notes,
          created_at: transaction.created_at,
          items: []
        });
      }

      // Add item to transaction if it exists (left join may have null items)
      if (item) {
        const transactionWithItems = transactionsMap.get(transaction.id)!;
        transactionWithItems.items.push({
          id: item.id,
          transaction_id: item.transaction_id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price), // Convert numeric to number
          subtotal: parseFloat(item.subtotal), // Convert numeric to number
          created_at: item.created_at
        });
      }
    }

    // Convert map to array and return
    return Array.from(transactionsMap.values());
  } catch (error) {
    console.error('Failed to get sales transactions:', error);
    throw error;
  }
}