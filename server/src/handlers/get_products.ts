import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { asc } from 'drizzle-orm';

export const getProducts = async (): Promise<Product[]> => {
  try {
    // Query all products from the database, ordered by name for consistent results
    const results = await db.select()
      .from(productsTable)
      .orderBy(asc(productsTable.name))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
};