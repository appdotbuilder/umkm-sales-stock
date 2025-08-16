import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { getProductById } from '../handlers/get_product_by_id';

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a product when found', async () => {
    // Create test product
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '29.99', // Insert as string for numeric column
        stock_quantity: 50,
        min_stock_threshold: 10
      })
      .returning()
      .execute();

    const insertedProduct = insertResult[0];

    // Get product by ID
    const result = await getProductById(insertedProduct.id);

    // Verify the product is returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(insertedProduct.id);
    expect(result!.name).toEqual('Test Product');
    expect(result!.description).toEqual('A test product');
    expect(result!.price).toEqual(29.99); // Should be converted to number
    expect(typeof result!.price).toEqual('number');
    expect(result!.stock_quantity).toEqual(50);
    expect(result!.min_stock_threshold).toEqual(10);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when product not found', async () => {
    // Try to get non-existent product
    const result = await getProductById(999);

    expect(result).toBeNull();
  });

  it('should handle products with null description', async () => {
    // Create product with null description
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Product No Description',
        description: null,
        price: '15.50',
        stock_quantity: 25,
        min_stock_threshold: 5
      })
      .returning()
      .execute();

    const insertedProduct = insertResult[0];

    // Get product by ID
    const result = await getProductById(insertedProduct.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Product No Description');
    expect(result!.description).toBeNull();
    expect(result!.price).toEqual(15.50);
    expect(typeof result!.price).toEqual('number');
  });

  it('should handle products with default values', async () => {
    // Create product with minimal data (using defaults)
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Minimal Product',
        price: '10.00'
        // stock_quantity and min_stock_threshold will use defaults (0 and 10)
      })
      .returning()
      .execute();

    const insertedProduct = insertResult[0];

    // Get product by ID
    const result = await getProductById(insertedProduct.id);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Minimal Product');
    expect(result!.price).toEqual(10.00);
    expect(result!.stock_quantity).toEqual(0); // Default value
    expect(result!.min_stock_threshold).toEqual(10); // Default value
  });

  it('should handle decimal prices correctly', async () => {
    // Test various decimal precision
    const testCases = [
      { name: 'Precise Price', price: '123.45' },
      { name: 'Single Decimal', price: '99.9' },
      { name: 'Whole Number', price: '100.00' },
      { name: 'Many Decimals', price: '999.99' }
    ];

    for (const testCase of testCases) {
      const insertResult = await db.insert(productsTable)
        .values({
          name: testCase.name,
          price: testCase.price,
          stock_quantity: 10,
          min_stock_threshold: 5
        })
        .returning()
        .execute();

      const result = await getProductById(insertResult[0].id);

      expect(result).not.toBeNull();
      expect(result!.price).toEqual(parseFloat(testCase.price));
      expect(typeof result!.price).toEqual('number');
    }
  });

  it('should preserve timestamp precision', async () => {
    // Create product
    const insertResult = await db.insert(productsTable)
      .values({
        name: 'Timestamp Test',
        price: '5.00',
        stock_quantity: 1,
        min_stock_threshold: 1
      })
      .returning()
      .execute();

    // Get product immediately
    const result = await getProductById(insertResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are close to current time (within 1 second)
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result!.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000);
  });
});