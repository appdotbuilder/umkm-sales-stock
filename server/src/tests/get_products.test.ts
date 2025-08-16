import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { getProducts } from '../handlers/get_products';

// Test data for creating products
const testProducts: CreateProductInput[] = [
  {
    name: 'Apple iPhone 15',
    description: 'Latest iPhone model',
    price: 15000000,
    stock_quantity: 50,
    min_stock_threshold: 5
  },
  {
    name: 'Samsung Galaxy S24',
    description: 'Premium Android smartphone',
    price: 12000000,
    stock_quantity: 30,
    min_stock_threshold: 10
  },
  {
    name: 'Budget Phone',
    description: null, // Test null description
    price: 2500000,
    stock_quantity: 100,
    min_stock_threshold: 20
  }
];

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should fetch all products from database', async () => {
    // Insert test products
    await db.insert(productsTable).values([
      {
        name: testProducts[0].name,
        description: testProducts[0].description,
        price: testProducts[0].price.toString(),
        stock_quantity: testProducts[0].stock_quantity,
        min_stock_threshold: testProducts[0].min_stock_threshold
      },
      {
        name: testProducts[1].name,
        description: testProducts[1].description,
        price: testProducts[1].price.toString(),
        stock_quantity: testProducts[1].stock_quantity,
        min_stock_threshold: testProducts[1].min_stock_threshold
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify first product (ordered alphabetically by name)
    const firstProduct = result[0];
    expect(firstProduct.name).toEqual('Apple iPhone 15');
    expect(firstProduct.description).toEqual('Latest iPhone model');
    expect(firstProduct.price).toEqual(15000000);
    expect(typeof firstProduct.price).toBe('number'); // Verify numeric conversion
    expect(firstProduct.stock_quantity).toEqual(50);
    expect(firstProduct.min_stock_threshold).toEqual(5);
    expect(firstProduct.id).toBeDefined();
    expect(firstProduct.created_at).toBeInstanceOf(Date);
    expect(firstProduct.updated_at).toBeInstanceOf(Date);

    // Verify second product
    const secondProduct = result[1];
    expect(secondProduct.name).toEqual('Samsung Galaxy S24');
    expect(secondProduct.price).toEqual(12000000);
    expect(typeof secondProduct.price).toBe('number');
  });

  it('should handle products with null descriptions', async () => {
    // Insert product with null description
    await db.insert(productsTable).values({
      name: testProducts[2].name,
      description: testProducts[2].description, // null
      price: testProducts[2].price.toString(),
      stock_quantity: testProducts[2].stock_quantity,
      min_stock_threshold: testProducts[2].min_stock_threshold
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Budget Phone');
    expect(result[0].description).toBeNull();
    expect(result[0].price).toEqual(2500000);
    expect(typeof result[0].price).toBe('number');
  });

  it('should return products ordered by name', async () => {
    // Insert products in reverse alphabetical order
    await db.insert(productsTable).values([
      {
        name: 'Zebra Product',
        description: 'Last alphabetically',
        price: '1000.00',
        stock_quantity: 10,
        min_stock_threshold: 5
      },
      {
        name: 'Alpha Product',
        description: 'First alphabetically',
        price: '2000.00',
        stock_quantity: 20,
        min_stock_threshold: 10
      },
      {
        name: 'Beta Product',
        description: 'Second alphabetically',
        price: '1500.00',
        stock_quantity: 15,
        min_stock_threshold: 8
      }
    ]).execute();

    const result = await getProducts();

    expect(result).toHaveLength(3);
    // Verify alphabetical ordering
    expect(result[0].name).toEqual('Alpha Product');
    expect(result[1].name).toEqual('Beta Product');
    expect(result[2].name).toEqual('Zebra Product');
    
    // Verify all prices are properly converted to numbers
    expect(typeof result[0].price).toBe('number');
    expect(typeof result[1].price).toBe('number');
    expect(typeof result[2].price).toBe('number');
    expect(result[0].price).toEqual(2000);
    expect(result[1].price).toEqual(1500);
    expect(result[2].price).toEqual(1000);
  });

  it('should handle products with decimal prices correctly', async () => {
    // Insert product with decimal price
    await db.insert(productsTable).values({
      name: 'Decimal Price Product',
      description: 'Product with decimal pricing',
      price: '1999.99',
      stock_quantity: 25,
      min_stock_threshold: 5
    }).execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].price).toEqual(1999.99);
    expect(typeof result[0].price).toBe('number');
  });
});