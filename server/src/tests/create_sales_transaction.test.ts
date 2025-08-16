import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type CreateSalesTransactionInput } from '../schema';
import { createSalesTransaction } from '../handlers/create_sales_transaction';
import { eq } from 'drizzle-orm';

describe('createSalesTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test products
  const createTestProducts = async () => {
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Test Product 1',
          description: 'First test product',
          price: '25.50',
          stock_quantity: 100,
          min_stock_threshold: 10
        },
        {
          name: 'Test Product 2', 
          description: 'Second test product',
          price: '15.75',
          stock_quantity: 50,
          min_stock_threshold: 5
        },
        {
          name: 'Low Stock Product',
          description: 'Product with low stock',
          price: '10.00',
          stock_quantity: 2,
          min_stock_threshold: 5
        }
      ])
      .returning()
      .execute();
    
    return products;
  };

  it('should create a sales transaction with single item', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 3
        }
      ],
      notes: 'Test transaction'
    };

    const result = await createSalesTransaction(input);

    // Verify transaction properties
    expect(result.id).toBeDefined();
    expect(result.transaction_date).toBeInstanceOf(Date);
    expect(result.total_amount).toEqual(76.50); // 25.50 * 3
    expect(result.notes).toEqual('Test transaction');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');

    // Verify transaction items
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.id).toBeDefined();
    expect(item.transaction_id).toEqual(result.id);
    expect(item.product_id).toEqual(products[0].id);
    expect(item.product_name).toEqual('Test Product 1');
    expect(item.quantity).toEqual(3);
    expect(item.unit_price).toEqual(25.50);
    expect(item.subtotal).toEqual(76.50);
    expect(typeof item.unit_price).toBe('number');
    expect(typeof item.subtotal).toBe('number');
    expect(item.created_at).toBeInstanceOf(Date);
  });

  it('should create a sales transaction with multiple items', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 2
        },
        {
          product_id: products[1].id,
          quantity: 4
        }
      ],
      notes: 'Multi-item transaction'
    };

    const result = await createSalesTransaction(input);

    // Verify total calculation: (25.50 * 2) + (15.75 * 4) = 51.00 + 63.00 = 114.00
    expect(result.total_amount).toEqual(114.00);
    expect(result.items).toHaveLength(2);
    expect(result.notes).toEqual('Multi-item transaction');

    // Verify individual items
    const item1 = result.items.find(item => item.product_id === products[0].id);
    const item2 = result.items.find(item => item.product_id === products[1].id);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(item1!.unit_price).toEqual(25.50);
    expect(item1!.subtotal).toEqual(51.00);

    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(4);
    expect(item2!.unit_price).toEqual(15.75);
    expect(item2!.subtotal).toEqual(63.00);
  });

  it('should update product stock quantities correctly', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 5
        },
        {
          product_id: products[1].id,
          quantity: 3
        }
      ]
    };

    await createSalesTransaction(input);

    // Check updated stock quantities
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[0].id))
      .execute();
    
    const product1 = updatedProducts[0];
    expect(product1.stock_quantity).toEqual(95); // 100 - 5

    const updatedProducts2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[1].id))
      .execute();
    
    const product2 = updatedProducts2[0];
    expect(product2.stock_quantity).toEqual(47); // 50 - 3
  });

  it('should save transaction and items to database correctly', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 2
        }
      ],
      notes: 'Database test'
    };

    const result = await createSalesTransaction(input);

    // Verify transaction in database
    const transactions = await db.select()
      .from(salesTransactionsTable)
      .where(eq(salesTransactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].total_amount)).toEqual(51.00);
    expect(transactions[0].notes).toEqual('Database test');

    // Verify transaction items in database
    const items = await db.select()
      .from(salesTransactionItemsTable)
      .where(eq(salesTransactionItemsTable.transaction_id, result.id))
      .execute();

    expect(items).toHaveLength(1);
    expect(items[0].product_id).toEqual(products[0].id);
    expect(items[0].product_name).toEqual('Test Product 1');
    expect(items[0].quantity).toEqual(2);
    expect(parseFloat(items[0].unit_price)).toEqual(25.50);
    expect(parseFloat(items[0].subtotal)).toEqual(51.00);
  });

  it('should handle transaction without notes', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 1
        }
      ]
    };

    const result = await createSalesTransaction(input);
    expect(result.notes).toBeNull();
  });

  it('should throw error when product does not exist', async () => {
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: 999, // Non-existent product ID
          quantity: 1
        }
      ]
    };

    await expect(createSalesTransaction(input)).rejects.toThrow(/products not found/i);
  });

  it('should throw error when multiple products do not exist', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id, // Valid product
          quantity: 1
        },
        {
          product_id: 998, // Invalid product
          quantity: 1
        },
        {
          product_id: 999, // Another invalid product
          quantity: 1
        }
      ]
    };

    await expect(createSalesTransaction(input)).rejects.toThrow(/products not found.*998.*999/i);
  });

  it('should throw error when insufficient stock', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[2].id, // Low Stock Product with only 2 in stock
          quantity: 5
        }
      ]
    };

    await expect(createSalesTransaction(input)).rejects.toThrow(/insufficient stock.*low stock product.*available.*2.*requested.*5/i);
  });

  it('should throw error when one item has insufficient stock in multi-item transaction', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id, // Valid item with enough stock
          quantity: 2
        },
        {
          product_id: products[2].id, // Low stock item
          quantity: 5 // More than available
        }
      ]
    };

    await expect(createSalesTransaction(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should handle exact stock quantity purchase', async () => {
    const products = await createTestProducts();
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[2].id, // Low Stock Product with exactly 2 in stock
          quantity: 2
        }
      ]
    };

    const result = await createSalesTransaction(input);
    expect(result.total_amount).toEqual(20.00); // 10.00 * 2

    // Check that stock is now zero
    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[2].id))
      .execute();
    
    expect(updatedProduct[0].stock_quantity).toEqual(0);
  });

  it('should maintain data consistency on error (rollback transaction)', async () => {
    const products = await createTestProducts();
    const originalStock = products[0].stock_quantity;
    
    const input: CreateSalesTransactionInput = {
      items: [
        {
          product_id: products[0].id,
          quantity: 2
        },
        {
          product_id: 999, // Non-existent product - should cause rollback
          quantity: 1
        }
      ]
    };

    await expect(createSalesTransaction(input)).rejects.toThrow();

    // Verify no transactions were created
    const transactions = await db.select()
      .from(salesTransactionsTable)
      .execute();
    expect(transactions).toHaveLength(0);

    // Verify no transaction items were created
    const items = await db.select()
      .from(salesTransactionItemsTable)
      .execute();
    expect(items).toHaveLength(0);

    // Verify stock quantities were not modified
    const unchangedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, products[0].id))
      .execute();
    
    expect(unchangedProduct[0].stock_quantity).toEqual(originalStock);
  });
});