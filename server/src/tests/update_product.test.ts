import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type CreateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

// Helper function to create a test product
const createTestProduct = async (data: Partial<CreateProductInput> = {}) => {
  const productData = {
    name: 'Original Product',
    description: 'Original description',
    price: 15.99,
    stock_quantity: 50,
    min_stock_threshold: 10,
    ...data
  };

  const result = await db.insert(productsTable)
    .values({
      ...productData,
      price: productData.price.toString() // Convert to string for numeric column
    })
    .returning()
    .execute();

  return {
    ...result[0],
    price: parseFloat(result[0].price) // Convert back to number
  };
};

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product name only', async () => {
    const existingProduct = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.id).toEqual(existingProduct.id);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual(existingProduct.description);
    expect(result.price).toEqual(existingProduct.price);
    expect(result.stock_quantity).toEqual(existingProduct.stock_quantity);
    expect(result.min_stock_threshold).toEqual(existingProduct.min_stock_threshold);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(existingProduct.updated_at.getTime());
  });

  it('should update multiple fields', async () => {
    const existingProduct = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      name: 'New Name',
      price: 25.99,
      stock_quantity: 75,
      min_stock_threshold: 15
    };

    const result = await updateProduct(updateInput);

    expect(result.name).toEqual('New Name');
    expect(result.price).toEqual(25.99);
    expect(result.stock_quantity).toEqual(75);
    expect(result.min_stock_threshold).toEqual(15);
    expect(result.description).toEqual(existingProduct.description); // Unchanged
    expect(typeof result.price).toBe('number');
  });

  it('should update description to null', async () => {
    const existingProduct = await createTestProduct({
      description: 'Some description'
    });
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      description: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.name).toEqual(existingProduct.name); // Unchanged
  });

  it('should update description from null to string', async () => {
    const existingProduct = await createTestProduct({
      description: null
    });
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      description: 'New description'
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toEqual('New description');
  });

  it('should save updated product to database', async () => {
    const existingProduct = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      name: 'Database Updated Name',
      price: 99.99
    };

    await updateProduct(updateInput);

    // Query database directly to verify changes were persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, existingProduct.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Updated Name');
    expect(parseFloat(products[0].price)).toEqual(99.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
    expect(products[0].updated_at.getTime()).toBeGreaterThan(existingProduct.updated_at.getTime());
  });

  it('should update stock_quantity to zero', async () => {
    const existingProduct = await createTestProduct({
      stock_quantity: 100
    });
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      stock_quantity: 0
    };

    const result = await updateProduct(updateInput);

    expect(result.stock_quantity).toEqual(0);
    expect(result.name).toEqual(existingProduct.name); // Unchanged
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999, // Non-existent ID
      name: 'This should fail'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should handle price with decimals correctly', async () => {
    const existingProduct = await createTestProduct();
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      price: 123.45
    };

    const result = await updateProduct(updateInput);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, existingProduct.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.45);
  });

  it('should not change created_at timestamp', async () => {
    const existingProduct = await createTestProduct();
    const originalCreatedAt = existingProduct.created_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const updateInput: UpdateProductInput = {
      id: existingProduct.id,
      name: 'Updated Name'
    };

    const result = await updateProduct(updateInput);

    expect(result.created_at.getTime()).toEqual(originalCreatedAt.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});