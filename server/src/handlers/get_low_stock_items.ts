import { db } from '../db';
import { productsTable } from '../db/schema';
import { type LowStockItem } from '../schema';
import { lte, desc, sql } from 'drizzle-orm';

export const getLowStockItems = async (): Promise<LowStockItem[]> => {
  try {
    // Query products where stock_quantity is less than or equal to min_stock_threshold
    const results = await db.select({
      id: productsTable.id,
      name: productsTable.name,
      current_stock: productsTable.stock_quantity,
      min_stock_threshold: productsTable.min_stock_threshold,
      // Calculate difference (negative value indicates how many units below threshold)
      difference: sql<number>`${productsTable.min_stock_threshold} - ${productsTable.stock_quantity}`
    })
    .from(productsTable)
    .where(lte(productsTable.stock_quantity, productsTable.min_stock_threshold))
    .orderBy(desc(sql`${productsTable.min_stock_threshold} - ${productsTable.stock_quantity}`)) // Most critical first
    .execute();

    // Return the low stock items
    return results.map(result => ({
      id: result.id,
      name: result.name,
      current_stock: result.current_stock,
      min_stock_threshold: result.min_stock_threshold,
      difference: result.difference
    }));
  } catch (error) {
    console.error('Get low stock items failed:', error);
    throw error;
  }
};