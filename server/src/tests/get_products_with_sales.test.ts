import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { getProductsWithSales } from '../handlers/get_products_with_sales';

describe('getProductsWithSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProductsWithSales();
    expect(result).toEqual([]);
  });

  it('should return products with zero sales data when no sales exist', async () => {
    // Create test products
    await db.insert(productsTable).values([
      {
        name: 'Product A',
        description: 'First product',
        price: '25.00',
        stock_quantity: 50,
        min_stock_threshold: 10
      },
      {
        name: 'Product B',
        description: 'Second product', 
        price: '15.50',
        stock_quantity: 30,
        min_stock_threshold: 5
      }
    ]).execute();

    const result = await getProductsWithSales();

    expect(result).toHaveLength(2);
    
    // Both products should have zero sales data
    const productNames = result.map(p => p.name).sort();
    expect(productNames).toEqual(['Product A', 'Product B']);
    
    // Find each product and verify their data
    const productA = result.find(p => p.name === 'Product A');
    const productB = result.find(p => p.name === 'Product B');
    
    expect(productA).toBeDefined();
    expect(productA!.price).toBe(25.00);
    expect(productA!.total_sold).toBe(0);
    expect(productA!.total_revenue).toBe(0);
    expect(productA!.id).toBeDefined();
    expect(productA!.created_at).toBeInstanceOf(Date);
    expect(productA!.updated_at).toBeInstanceOf(Date);

    expect(productB).toBeDefined();
    expect(productB!.price).toBe(15.50);
    expect(productB!.total_sold).toBe(0);
    expect(productB!.total_revenue).toBe(0);
  });

  it('should return products with correct sales aggregations', async () => {
    // Create test products
    const productResults = await db.insert(productsTable).values([
      {
        name: 'High Seller',
        description: 'Best selling product',
        price: '100.00',
        stock_quantity: 100,
        min_stock_threshold: 10
      },
      {
        name: 'Low Seller',
        description: 'Slow moving product',
        price: '50.00',
        stock_quantity: 50,
        min_stock_threshold: 5
      },
      {
        name: 'No Sales',
        description: 'Never sold',
        price: '75.00',
        stock_quantity: 25,
        min_stock_threshold: 5
      }
    ]).returning().execute();

    // Create test transaction
    const transactionResult = await db.insert(salesTransactionsTable).values({
      total_amount: '650.00',
      notes: 'Test transaction'
    }).returning().execute();

    const transactionId = transactionResult[0].id;
    const highSellerId = productResults[0].id;
    const lowSellerId = productResults[1].id;

    // Create transaction items with different quantities and prices
    await db.insert(salesTransactionItemsTable).values([
      {
        transaction_id: transactionId,
        product_id: highSellerId,
        product_name: 'High Seller',
        quantity: 3,
        unit_price: '100.00',
        subtotal: '300.00'
      },
      {
        transaction_id: transactionId,
        product_id: highSellerId,
        product_name: 'High Seller',
        quantity: 2,
        unit_price: '100.00',
        subtotal: '200.00'
      },
      {
        transaction_id: transactionId,
        product_id: lowSellerId,
        product_name: 'Low Seller',
        quantity: 3,
        unit_price: '50.00',
        subtotal: '150.00'
      }
    ]).execute();

    const result = await getProductsWithSales();

    expect(result).toHaveLength(3);

    // Should be ordered by total_revenue DESC
    expect(result[0].name).toBe('High Seller');
    expect(result[0].total_sold).toBe(5); // 3 + 2
    expect(result[0].total_revenue).toBe(500.00); // 300 + 200
    expect(result[0].price).toBe(100.00);

    expect(result[1].name).toBe('Low Seller');
    expect(result[1].total_sold).toBe(3);
    expect(result[1].total_revenue).toBe(150.00);
    expect(result[1].price).toBe(50.00);

    expect(result[2].name).toBe('No Sales');
    expect(result[2].total_sold).toBe(0);
    expect(result[2].total_revenue).toBe(0);
    expect(result[2].price).toBe(75.00);
  });

  it('should handle multiple transactions for same product', async () => {
    // Create test product
    const productResult = await db.insert(productsTable).values({
      name: 'Multi-Transaction Product',
      description: 'Sold in multiple transactions',
      price: '25.00',
      stock_quantity: 100,
      min_stock_threshold: 10
    }).returning().execute();

    const productId = productResult[0].id;

    // Create multiple transactions
    const transaction1 = await db.insert(salesTransactionsTable).values({
      total_amount: '75.00',
      notes: 'Transaction 1'
    }).returning().execute();

    const transaction2 = await db.insert(salesTransactionsTable).values({
      total_amount: '50.00',
      notes: 'Transaction 2'
    }).returning().execute();

    // Add items to both transactions
    await db.insert(salesTransactionItemsTable).values([
      {
        transaction_id: transaction1[0].id,
        product_id: productId,
        product_name: 'Multi-Transaction Product',
        quantity: 3,
        unit_price: '25.00',
        subtotal: '75.00'
      },
      {
        transaction_id: transaction2[0].id,
        product_id: productId,
        product_name: 'Multi-Transaction Product',
        quantity: 2,
        unit_price: '25.00',
        subtotal: '50.00'
      }
    ]).execute();

    const result = await getProductsWithSales();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Multi-Transaction Product');
    expect(result[0].total_sold).toBe(5); // 3 + 2 across transactions
    expect(result[0].total_revenue).toBe(125.00); // 75 + 50 across transactions
    expect(result[0].price).toBe(25.00);
  });

  it('should preserve all product fields correctly', async () => {
    // Create product with all possible field values
    const productResult = await db.insert(productsTable).values({
      name: 'Complete Product',
      description: 'Product with all fields',
      price: '99.99',
      stock_quantity: 42,
      min_stock_threshold: 15
    }).returning().execute();

    const result = await getProductsWithSales();

    expect(result).toHaveLength(1);
    const product = result[0];
    
    // Verify all fields are present and correct types
    expect(product.id).toBe(productResult[0].id);
    expect(product.name).toBe('Complete Product');
    expect(product.description).toBe('Product with all fields');
    expect(typeof product.price).toBe('number');
    expect(product.price).toBe(99.99);
    expect(product.stock_quantity).toBe(42);
    expect(product.min_stock_threshold).toBe(15);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
    expect(typeof product.total_sold).toBe('number');
    expect(typeof product.total_revenue).toBe('number');
    expect(product.total_sold).toBe(0);
    expect(product.total_revenue).toBe(0);
  });

  it('should handle null description correctly', async () => {
    // Create product with null description
    await db.insert(productsTable).values({
      name: 'No Description Product',
      description: null,
      price: '10.00',
      stock_quantity: 5,
      min_stock_threshold: 2
    }).execute();

    const result = await getProductsWithSales();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('No Description Product');
    expect(result[0].description).toBeNull();
    expect(result[0].price).toBe(10.00);
  });
});