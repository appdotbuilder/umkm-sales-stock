import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { updateStock, type UpdateStockInput } from '../handlers/update_stock';

describe('updateStock', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testProduct: any;

  beforeEach(async () => {
    // Create a test product with initial stock
    const products = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing stock updates',
        price: '29.99',
        stock_quantity: 50,
        min_stock_threshold: 10
      })
      .returning()
      .execute();
    
    testProduct = products[0];
  });

  it('should increase stock quantity', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 25,
      reason: 'Inventory restock'
    };

    const result = await updateStock(input);

    expect(result.id).toEqual(testProduct.id);
    expect(result.stock_quantity).toEqual(75); // 50 + 25
    expect(result.name).toEqual('Test Product');
    expect(result.price).toEqual(29.99);
    expect(typeof result.price).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testProduct.updated_at).toBe(true);
  });

  it('should decrease stock quantity', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: -20,
      reason: 'Damaged inventory write-off'
    };

    const result = await updateStock(input);

    expect(result.stock_quantity).toEqual(30); // 50 - 20
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testProduct.updated_at).toBe(true);
  });

  it('should allow stock to reach zero', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: -50 // Reduce to exactly 0
    };

    const result = await updateStock(input);

    expect(result.stock_quantity).toEqual(0);
  });

  it('should prevent stock from going below zero', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: -75 // Try to reduce below 0
    };

    await expect(updateStock(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should preserve all other product fields', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 10
    };

    const result = await updateStock(input);

    expect(result.name).toEqual(testProduct.name);
    expect(result.description).toEqual(testProduct.description);
    expect(result.price).toEqual(parseFloat(testProduct.price));
    expect(result.min_stock_threshold).toEqual(testProduct.min_stock_threshold);
    expect(result.created_at).toEqual(testProduct.created_at);
  });

  it('should update the database record', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 15
    };

    await updateStock(input);

    // Verify the database was actually updated
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();

    expect(updatedProducts).toHaveLength(1);
    expect(updatedProducts[0].stock_quantity).toEqual(65); // 50 + 15
    expect(updatedProducts[0].updated_at > testProduct.updated_at).toBe(true);
  });

  it('should throw error for non-existent product', async () => {
    const input: UpdateStockInput = {
      product_id: 99999, // Non-existent ID
      quantity_change: 10
    };

    await expect(updateStock(input)).rejects.toThrow(/product with id 99999 not found/i);
  });

  it('should work without optional reason parameter', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 5
    };

    const result = await updateStock(input);

    expect(result.stock_quantity).toEqual(55);
  });

  it('should handle zero quantity change', async () => {
    const originalUpdatedAt = testProduct.updated_at;
    
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 0
    };

    const result = await updateStock(input);

    expect(result.stock_quantity).toEqual(50); // No change
    expect(result.updated_at > originalUpdatedAt).toBe(true); // But updated_at should still change
  });

  it('should handle large stock adjustments', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: 1000000 // Large increase
    };

    const result = await updateStock(input);

    expect(result.stock_quantity).toEqual(1000050);
  });

  it('should provide detailed error message for insufficient stock', async () => {
    const input: UpdateStockInput = {
      product_id: testProduct.id,
      quantity_change: -60 // More than available stock (50)
    };

    await expect(updateStock(input)).rejects.toThrow(/current stock: 50.*attempted change: -60/i);
  });
});