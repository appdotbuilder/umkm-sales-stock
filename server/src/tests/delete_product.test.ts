import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { deleteProduct } from '../handlers/delete_product';
import { eq } from 'drizzle-orm';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a product with no sales history', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product for testing',
        price: '19.99',
        stock_quantity: 100,
        min_stock_threshold: 10
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Delete the product
    const result = await deleteProduct(productId);

    expect(result.success).toBe(true);

    // Verify product was deleted from database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteProduct(nonExistentId)).rejects.toThrow(/product not found/i);
  });

  it('should throw error when product has sales history', async () => {
    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        description: 'A product with sales history',
        price: '29.99',
        stock_quantity: 50,
        min_stock_threshold: 5
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // Create a sales transaction
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '29.99',
        notes: 'Test transaction'
      })
      .returning()
      .execute();

    const transactionId = transactionResult[0].id;

    // Create a sales transaction item referencing the product
    await db.insert(salesTransactionItemsTable)
      .values({
        transaction_id: transactionId,
        product_id: productId,
        product_name: 'Test Product',
        quantity: 1,
        unit_price: '29.99',
        subtotal: '29.99'
      })
      .execute();

    // Attempt to delete the product should fail
    await expect(deleteProduct(productId)).rejects.toThrow(/cannot delete product with existing sales history/i);

    // Verify product still exists in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Test Product');
  });

  it('should handle multiple products with different sales history statuses', async () => {
    // Create two test products
    const productResult1 = await db.insert(productsTable)
      .values({
        name: 'Product Without Sales',
        description: 'No sales history',
        price: '15.99',
        stock_quantity: 20,
        min_stock_threshold: 5
      })
      .returning()
      .execute();

    const productResult2 = await db.insert(productsTable)
      .values({
        name: 'Product With Sales',
        description: 'Has sales history',
        price: '25.99',
        stock_quantity: 30,
        min_stock_threshold: 3
      })
      .returning()
      .execute();

    const productId1 = productResult1[0].id;
    const productId2 = productResult2[0].id;

    // Create sales history for product 2 only
    const transactionResult = await db.insert(salesTransactionsTable)
      .values({
        total_amount: '25.99',
        notes: 'Test transaction for product 2'
      })
      .returning()
      .execute();

    await db.insert(salesTransactionItemsTable)
      .values({
        transaction_id: transactionResult[0].id,
        product_id: productId2,
        product_name: 'Product With Sales',
        quantity: 1,
        unit_price: '25.99',
        subtotal: '25.99'
      })
      .execute();

    // Should be able to delete product 1 (no sales history)
    const result1 = await deleteProduct(productId1);
    expect(result1.success).toBe(true);

    // Verify product 1 was deleted
    const products1 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId1))
      .execute();
    expect(products1).toHaveLength(0);

    // Should NOT be able to delete product 2 (has sales history)
    await expect(deleteProduct(productId2)).rejects.toThrow(/cannot delete product with existing sales history/i);

    // Verify product 2 still exists
    const products2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId2))
      .execute();
    expect(products2).toHaveLength(1);
    expect(products2[0].name).toBe('Product With Sales');
  });
});