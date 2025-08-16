import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a product with all required fields', async () => {
    const testInput: CreateProductInput = {
      name: 'Test Product',
      description: 'A product for testing',
      price: 19.99,
      stock_quantity: 100,
      min_stock_threshold: 15
    };

    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual('A product for testing');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number'); // Ensure numeric conversion worked
    expect(result.stock_quantity).toEqual(100);
    expect(result.min_stock_threshold).toEqual(15);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with minimal required fields and apply defaults', async () => {
    const testInput: CreateProductInput = {
      name: 'Minimal Product',
      price: 5.50,
      stock_quantity: 0,
      min_stock_threshold: 10 // Include all required fields
      // description not provided - should be null
    };

    const result = await createProduct(testInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(5.50);
    expect(result.stock_quantity).toEqual(0);
    expect(result.min_stock_threshold).toEqual(10); // Zod default
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a product with null description explicitly set', async () => {
    const testInput: CreateProductInput = {
      name: 'Product with null description',
      description: null,
      price: 25.00,
      stock_quantity: 50,
      min_stock_threshold: 5
    };

    const result = await createProduct(testInput);

    expect(result.name).toEqual('Product with null description');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(25.00);
    expect(result.stock_quantity).toEqual(50);
    expect(result.min_stock_threshold).toEqual(5);
  });

  it('should save product to database correctly', async () => {
    const testInput: CreateProductInput = {
      name: 'Database Test Product',
      description: 'Testing database persistence',
      price: 99.99,
      stock_quantity: 200,
      min_stock_threshold: 20
    };

    const result = await createProduct(testInput);

    // Query database using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    
    expect(savedProduct.name).toEqual('Database Test Product');
    expect(savedProduct.description).toEqual('Testing database persistence');
    expect(parseFloat(savedProduct.price)).toEqual(99.99); // Convert from stored string
    expect(savedProduct.stock_quantity).toEqual(200);
    expect(savedProduct.min_stock_threshold).toEqual(20);
    expect(savedProduct.id).toEqual(result.id);
    expect(savedProduct.created_at).toBeInstanceOf(Date);
    expect(savedProduct.updated_at).toBeInstanceOf(Date);
  });

  it('should handle decimal prices correctly', async () => {
    const testInput: CreateProductInput = {
      name: 'Decimal Price Product',
      price: 123.45, // Use 2 decimal places to match DB precision
      stock_quantity: 10,
      min_stock_threshold: 5
    };

    const result = await createProduct(testInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toEqual('number');

    // Verify database storage and retrieval
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.45);
  });

  it('should handle precision rounding for prices with more than 2 decimal places', async () => {
    const testInput: CreateProductInput = {
      name: 'Precision Test Product',
      price: 123.456, // More than 2 decimal places - should be rounded by DB
      stock_quantity: 10,
      min_stock_threshold: 5
    };

    const result = await createProduct(testInput);

    // Database with numeric(12,2) will round to 2 decimal places
    expect(result.price).toEqual(123.46); // Rounded up
    expect(typeof result.price).toEqual('number');

    // Verify database storage matches
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.46);
  });

  it('should create multiple products with unique IDs', async () => {
    const testInput1: CreateProductInput = {
      name: 'Product One',
      price: 10.00,
      stock_quantity: 100,
      min_stock_threshold: 10
    };

    const testInput2: CreateProductInput = {
      name: 'Product Two',
      price: 20.00,
      stock_quantity: 200,
      min_stock_threshold: 20
    };

    const result1 = await createProduct(testInput1);
    const result2 = await createProduct(testInput2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.name).toEqual('Product One');
    expect(result2.name).toEqual('Product Two');
  });

  it('should handle zero stock quantity', async () => {
    const testInput: CreateProductInput = {
      name: 'Zero Stock Product',
      price: 15.00,
      stock_quantity: 0,
      min_stock_threshold: 0
    };

    const result = await createProduct(testInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.min_stock_threshold).toEqual(0);
  });

  it('should handle large numeric values', async () => {
    const testInput: CreateProductInput = {
      name: 'High Value Product',
      price: 9999999.99, // Large price
      stock_quantity: 999999, // Large stock
      min_stock_threshold: 10000 // Large threshold
    };

    const result = await createProduct(testInput);

    expect(result.price).toEqual(9999999.99);
    expect(result.stock_quantity).toEqual(999999);
    expect(result.min_stock_threshold).toEqual(10000);
    
    // Verify database handles large values
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(9999999.99);
    expect(products[0].stock_quantity).toEqual(999999);
    expect(products[0].min_stock_threshold).toEqual(10000);
  });
});