import { db } from '../db';
import { productsTable, salesTransactionItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteProduct(id: number): Promise<{ success: boolean }> {
  try {
    // Check if product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // Check if product has associated sales transaction items
    const salesItems = await db.select()
      .from(salesTransactionItemsTable)
      .where(eq(salesTransactionItemsTable.product_id, id))
      .execute();

    if (salesItems.length > 0) {
      throw new Error('Cannot delete product with existing sales history');
    }

    // Delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}