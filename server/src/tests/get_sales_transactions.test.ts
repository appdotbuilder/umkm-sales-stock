import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { getSalesTransactions } from '../handlers/get_sales_transactions';

describe('getSalesTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no transactions exist', async () => {
    const result = await getSalesTransactions();

    expect(result).toEqual([]);
  });

  it('should return transaction without items when no items exist', async () => {
    // Create a transaction without items
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '100.00',
        notes: 'Test transaction'
      })
      .returning()
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(transactionResult[0].id);
    expect(result[0].total_amount).toEqual(100.00);
    expect(typeof result[0].total_amount).toBe('number');
    expect(result[0].notes).toEqual('Test transaction');
    expect(result[0].items).toEqual([]);
    expect(result[0].transaction_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return transaction with items', async () => {
    // Create a product first
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A test product',
        price: '25.50',
        stock_quantity: 100,
        min_stock_threshold: 10
      })
      .returning()
      .execute();

    // Create a transaction
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '51.00',
        notes: 'Transaction with items'
      })
      .returning()
      .execute();

    // Create transaction items
    await db.insert(salesTransactionItemsTable)
      .values([
        {
          transaction_id: transactionResult[0].id,
          product_id: productResult[0].id,
          product_name: 'Test Product',
          quantity: 2,
          unit_price: '25.50',
          subtotal: '51.00'
        }
      ])
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(1);
    
    const transaction = result[0];
    expect(transaction.id).toEqual(transactionResult[0].id);
    expect(transaction.total_amount).toEqual(51.00);
    expect(typeof transaction.total_amount).toBe('number');
    expect(transaction.notes).toEqual('Transaction with items');
    expect(transaction.items).toHaveLength(1);

    const item = transaction.items[0];
    expect(item.product_id).toEqual(productResult[0].id);
    expect(item.product_name).toEqual('Test Product');
    expect(item.quantity).toEqual(2);
    expect(item.unit_price).toEqual(25.50);
    expect(typeof item.unit_price).toBe('number');
    expect(item.subtotal).toEqual(51.00);
    expect(typeof item.subtotal).toBe('number');
    expect(item.created_at).toBeInstanceOf(Date);
  });

  it('should return multiple transactions with multiple items each', async () => {
    // Create products
    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          description: 'First product',
          price: '10.00',
          stock_quantity: 50,
          min_stock_threshold: 5
        },
        {
          name: 'Product B',
          description: 'Second product',
          price: '20.00',
          stock_quantity: 30,
          min_stock_threshold: 3
        }
      ])
      .returning()
      .execute();

    // Create transactions (insert with different dates to test ordering)
    const olderTransaction = await db.insert(salesTransactionsTable)
      .values({
        transaction_date: new Date('2023-01-01'),
        total_amount: '30.00',
        notes: 'Older transaction'
      })
      .returning()
      .execute();

    const newerTransaction = await db.insert(salesTransactionsTable)
      .values({
        transaction_date: new Date('2023-01-02'),
        total_amount: '50.00',
        notes: 'Newer transaction'
      })
      .returning()
      .execute();

    // Create items for both transactions
    await db.insert(salesTransactionItemsTable)
      .values([
        // Items for older transaction
        {
          transaction_id: olderTransaction[0].id,
          product_id: productResults[0].id,
          product_name: 'Product A',
          quantity: 3,
          unit_price: '10.00',
          subtotal: '30.00'
        },
        // Items for newer transaction
        {
          transaction_id: newerTransaction[0].id,
          product_id: productResults[0].id,
          product_name: 'Product A',
          quantity: 1,
          unit_price: '10.00',
          subtotal: '10.00'
        },
        {
          transaction_id: newerTransaction[0].id,
          product_id: productResults[1].id,
          product_name: 'Product B',
          quantity: 2,
          unit_price: '20.00',
          subtotal: '40.00'
        }
      ])
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(2);

    // Should be ordered by transaction_date DESC (newest first)
    expect(result[0].id).toEqual(newerTransaction[0].id);
    expect(result[0].notes).toEqual('Newer transaction');
    expect(result[0].items).toHaveLength(2);

    expect(result[1].id).toEqual(olderTransaction[0].id);
    expect(result[1].notes).toEqual('Older transaction');
    expect(result[1].items).toHaveLength(1);

    // Verify numeric conversions
    result.forEach(transaction => {
      expect(typeof transaction.total_amount).toBe('number');
      transaction.items.forEach(item => {
        expect(typeof item.unit_price).toBe('number');
        expect(typeof item.subtotal).toBe('number');
      });
    });
  });

  it('should handle transactions with null notes and descriptions', async () => {
    // Create product without description
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Simple Product',
        description: null,
        price: '15.00',
        stock_quantity: 25,
        min_stock_threshold: 5
      })
      .returning()
      .execute();

    // Create transaction without notes
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '15.00',
        notes: null
      })
      .returning()
      .execute();

    // Create transaction item
    await db.insert(salesTransactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        product_id: productResult[0].id,
        product_name: 'Simple Product',
        quantity: 1,
        unit_price: '15.00',
        subtotal: '15.00'
      })
      .execute();

    const result = await getSalesTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].notes).toBeNull();
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].product_name).toEqual('Simple Product');
  });
});