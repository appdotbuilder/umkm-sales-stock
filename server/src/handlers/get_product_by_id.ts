import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Product } from '../schema';

export async function getProductById(id: number): Promise<Product | null> {
  try {
    // Query product by ID
    const result = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    // Return null if product not found
    if (result.length === 0) {
      return null;
    }

    const product = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to get product by ID:', error);
    throw error;
  }
}