import { db } from '../db';
import { productsTable, salesTransactionItemsTable } from '../db/schema';
import { type ProductWithSales } from '../schema';
import { sql, desc } from 'drizzle-orm';

export async function getProductsWithSales(): Promise<ProductWithSales[]> {
  try {
    // Query products with aggregated sales data using LEFT JOIN to include products with no sales
    const results = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        price: productsTable.price,
        stock_quantity: productsTable.stock_quantity,
        min_stock_threshold: productsTable.min_stock_threshold,
        created_at: productsTable.created_at,
        updated_at: productsTable.updated_at,
        total_sold: sql<string>`COALESCE(SUM(${salesTransactionItemsTable.quantity}), 0)`,
        total_revenue: sql<string>`COALESCE(SUM(${salesTransactionItemsTable.subtotal}), 0)`
      })
      .from(productsTable)
      .leftJoin(salesTransactionItemsTable, sql`${productsTable.id} = ${salesTransactionItemsTable.product_id}`)
      .groupBy(productsTable.id)
      .orderBy(desc(sql`COALESCE(SUM(${salesTransactionItemsTable.subtotal}), 0)`))
      .execute();

    // Convert numeric fields and ensure proper typing
    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description,
      price: parseFloat(result.price), // Convert numeric to number
      stock_quantity: result.stock_quantity,
      min_stock_threshold: result.min_stock_threshold,
      created_at: result.created_at,
      updated_at: result.updated_at,
      total_sold: parseInt(result.total_sold, 10), // Convert aggregated sum to integer
      total_revenue: parseFloat(result.total_revenue) // Convert aggregated sum to number
    }));
  } catch (error) {
    console.error('Failed to fetch products with sales data:', error);
    throw error;
  }
}