import { db } from '../db';
import { salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type TransactionWithItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTransactionById(id: number): Promise<TransactionWithItems | null> {
  try {
    // Query the transaction by ID
    const transactions = await db.select()
      .from(salesTransactionsTable)
      .where(eq(salesTransactionsTable.id, id))
      .execute();

    if (transactions.length === 0) {
      return null;
    }

    const transaction = transactions[0];

    // Query related transaction items
    const items = await db.select()
      .from(salesTransactionItemsTable)
      .where(eq(salesTransactionItemsTable.transaction_id, id))
      .execute();

    // Convert numeric fields to numbers and return the complete transaction
    return {
      id: transaction.id,
      transaction_date: transaction.transaction_date,
      total_amount: parseFloat(transaction.total_amount),
      notes: transaction.notes,
      created_at: transaction.created_at,
      items: items.map(item => ({
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
  } catch (error) {
    console.error('Failed to get transaction by ID:', error);
    throw error;
  }
}