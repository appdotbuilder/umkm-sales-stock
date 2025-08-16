import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getLowStockItems } from '../handlers/get_low_stock_items';

describe('getLowStockItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getLowStockItems();
    expect(result).toEqual([]);
  });

  it('should return empty array when all products are above threshold', async () => {
    // Create products with stock above threshold
    await db.insert(productsTable).values([
      {
        name: 'Product 1',
        description: 'Test product 1',
        price: '100.00',
        stock_quantity: 20,
        min_stock_threshold: 10
      },
      {
        name: 'Product 2', 
        description: 'Test product 2',
        price: '150.00',
        stock_quantity: 15,
        min_stock_threshold: 5
      }
    ]).execute();

    const result = await getLowStockItems();
    expect(result).toEqual([]);
  });

  it('should return products with stock below threshold', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        name: 'Low Stock Product',
        description: 'Product with low stock',
        price: '50.00',
        stock_quantity: 5,
        min_stock_threshold: 10 // 5 units below threshold
      },
      {
        name: 'Normal Stock Product',
        description: 'Product with normal stock',
        price: '75.00',
        stock_quantity: 20,
        min_stock_threshold: 15 // Above threshold
      },
      {
        name: 'Critical Stock Product',
        description: 'Product with critical low stock',
        price: '30.00',
        stock_quantity: 2,
        min_stock_threshold: 12 // 10 units below threshold
      }
    ]).execute();

    const result = await getLowStockItems();

    // Should return 2 products (excluding the normal stock one)
    expect(result).toHaveLength(2);

    // Should be ordered by difference DESC (most critical first)
    expect(result[0].name).toEqual('Critical Stock Product');
    expect(result[0].current_stock).toEqual(2);
    expect(result[0].min_stock_threshold).toEqual(12);
    expect(result[0].difference).toEqual(10); // 12 - 2 = 10

    expect(result[1].name).toEqual('Low Stock Product');
    expect(result[1].current_stock).toEqual(5);
    expect(result[1].min_stock_threshold).toEqual(10);
    expect(result[1].difference).toEqual(5); // 10 - 5 = 5
  });

  it('should include products at exactly the threshold', async () => {
    // Create product with stock exactly at threshold
    await db.insert(productsTable).values({
      name: 'Threshold Product',
      description: 'Product at threshold',
      price: '40.00',
      stock_quantity: 8,
      min_stock_threshold: 8 // Exactly at threshold
    }).execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Threshold Product');
    expect(result[0].current_stock).toEqual(8);
    expect(result[0].min_stock_threshold).toEqual(8);
    expect(result[0].difference).toEqual(0); // 8 - 8 = 0
  });

  it('should handle products with zero stock', async () => {
    // Create product with zero stock
    await db.insert(productsTable).values({
      name: 'Out of Stock Product',
      description: 'Product with zero stock',
      price: '60.00',
      stock_quantity: 0,
      min_stock_threshold: 5
    }).execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Out of Stock Product');
    expect(result[0].current_stock).toEqual(0);
    expect(result[0].min_stock_threshold).toEqual(5);
    expect(result[0].difference).toEqual(5); // 5 - 0 = 5
  });

  it('should order results by difference descending (most critical first)', async () => {
    // Create multiple low stock products with different severity
    await db.insert(productsTable).values([
      {
        name: 'Slightly Low',
        description: 'Slightly below threshold',
        price: '25.00',
        stock_quantity: 9,
        min_stock_threshold: 10 // 1 unit below
      },
      {
        name: 'Very Low',
        description: 'Very below threshold',
        price: '35.00',
        stock_quantity: 2,
        min_stock_threshold: 15 // 13 units below
      },
      {
        name: 'Moderately Low',
        description: 'Moderately below threshold',
        price: '45.00',
        stock_quantity: 3,
        min_stock_threshold: 8 // 5 units below
      }
    ]).execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(3);

    // Should be ordered by difference DESC
    expect(result[0].name).toEqual('Very Low');
    expect(result[0].difference).toEqual(13);

    expect(result[1].name).toEqual('Moderately Low');
    expect(result[1].difference).toEqual(5);

    expect(result[2].name).toEqual('Slightly Low');
    expect(result[2].difference).toEqual(1);
  });

  it('should handle multiple products with same difference correctly', async () => {
    // Create products with same difference
    await db.insert(productsTable).values([
      {
        name: 'Product A',
        description: 'First product',
        price: '20.00',
        stock_quantity: 5,
        min_stock_threshold: 10 // 5 units below
      },
      {
        name: 'Product B',
        description: 'Second product',
        price: '30.00',
        stock_quantity: 2,
        min_stock_threshold: 7 // 5 units below
      }
    ]).execute();

    const result = await getLowStockItems();

    expect(result).toHaveLength(2);
    
    // Both should have same difference
    expect(result[0].difference).toEqual(5);
    expect(result[1].difference).toEqual(5);
    
    // Verify both products are included
    const productNames = result.map(item => item.name);
    expect(productNames).toContain('Product A');
    expect(productNames).toContain('Product B');
  });
});