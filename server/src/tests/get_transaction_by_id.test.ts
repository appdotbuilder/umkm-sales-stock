import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { getTransactionById } from '../handlers/get_transaction_by_id';

describe('getTransactionById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent transaction', async () => {
    const result = await getTransactionById(999);
    expect(result).toBeNull();
  });

  it('should return transaction with items', async () => {
    // Create test product
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
    const product = productResult[0];

    // Create test transaction
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '76.50',
        notes: 'Test transaction'
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Create transaction items
    await db.insert(salesTransactionItemsTable)
      .values([
        {
          transaction_id: transaction.id,
          product_id: product.id,
          product_name: 'Test Product',
          quantity: 2,
          unit_price: '25.50',
          subtotal: '51.00'
        },
        {
          transaction_id: transaction.id,
          product_id: product.id,
          product_name: 'Test Product',
          quantity: 1,
          unit_price: '25.50',
          subtotal: '25.50'
        }
      ])
      .execute();

    const result = await getTransactionById(transaction.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transaction.id);
    expect(result!.total_amount).toEqual(76.50);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.notes).toEqual('Test transaction');
    expect(result!.transaction_date).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);

    // Verify items
    expect(result!.items).toHaveLength(2);
    
    const firstItem = result!.items[0];
    expect(firstItem.transaction_id).toEqual(transaction.id);
    expect(firstItem.product_id).toEqual(product.id);
    expect(firstItem.product_name).toEqual('Test Product');
    expect(firstItem.quantity).toEqual(2);
    expect(firstItem.unit_price).toEqual(25.50);
    expect(typeof firstItem.unit_price).toBe('number');
    expect(firstItem.subtotal).toEqual(51.00);
    expect(typeof firstItem.subtotal).toBe('number');
    expect(firstItem.created_at).toBeInstanceOf(Date);

    const secondItem = result!.items[1];
    expect(secondItem.quantity).toEqual(1);
    expect(secondItem.subtotal).toEqual(25.50);
  });

  it('should return transaction with empty items array when no items exist', async () => {
    // Create transaction without items
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '0.00',
        notes: 'Empty transaction'
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    const result = await getTransactionById(transaction.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transaction.id);
    expect(result!.total_amount).toEqual(0.00);
    expect(result!.notes).toEqual('Empty transaction');
    expect(result!.items).toHaveLength(0);
    expect(Array.isArray(result!.items)).toBe(true);
  });

  it('should handle transaction with null notes', async () => {
    // Create transaction with null notes
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '50.00',
        notes: null
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    const result = await getTransactionById(transaction.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(transaction.id);
    expect(result!.total_amount).toEqual(50.00);
    expect(result!.notes).toBeNull();
  });

  it('should handle multiple products in single transaction', async () => {
    // Create multiple test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        description: 'First product',
        price: '10.00',
        stock_quantity: 50,
        min_stock_threshold: 5
      })
      .returning()
      .execute();
    const product1 = product1Result[0];

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        description: 'Second product',
        price: '15.75',
        stock_quantity: 30,
        min_stock_threshold: 10
      })
      .returning()
      .execute();
    const product2 = product2Result[0];

    // Create transaction
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '41.75',
        notes: 'Multi-product transaction'
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Create transaction items for different products
    await db.insert(salesTransactionItemsTable)
      .values([
        {
          transaction_id: transaction.id,
          product_id: product1.id,
          product_name: 'Product 1',
          quantity: 1,
          unit_price: '10.00',
          subtotal: '10.00'
        },
        {
          transaction_id: transaction.id,
          product_id: product2.id,
          product_name: 'Product 2',
          quantity: 2,
          unit_price: '15.75',
          subtotal: '31.50'
        }
      ])
      .execute();

    const result = await getTransactionById(transaction.id);

    expect(result).not.toBeNull();
    expect(result!.items).toHaveLength(2);
    
    // Find items by product name
    const product1Item = result!.items.find(item => item.product_name === 'Product 1');
    const product2Item = result!.items.find(item => item.product_name === 'Product 2');

    expect(product1Item).toBeDefined();
    expect(product1Item!.product_id).toEqual(product1.id);
    expect(product1Item!.quantity).toEqual(1);
    expect(product1Item!.unit_price).toEqual(10.00);
    expect(product1Item!.subtotal).toEqual(10.00);

    expect(product2Item).toBeDefined();
    expect(product2Item!.product_id).toEqual(product2.id);
    expect(product2Item!.quantity).toEqual(2);
    expect(product2Item!.unit_price).toEqual(15.75);
    expect(product2Item!.subtotal).toEqual(31.50);
  });
});