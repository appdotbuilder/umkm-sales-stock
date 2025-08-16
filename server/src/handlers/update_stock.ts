import { db } from '../db';
import { productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Product } from '../schema';

export interface UpdateStockInput {
    product_id: number;
    quantity_change: number; // Positive for stock increase, negative for decrease
    reason?: string; // Optional reason for stock adjustment
}

export async function updateStock(input: UpdateStockInput): Promise<Product> {
    try {
        // First, get the current product to check if it exists and get current stock
        const existingProducts = await db.select()
            .from(productsTable)
            .where(eq(productsTable.id, input.product_id))
            .execute();

        if (existingProducts.length === 0) {
            throw new Error(`Product with ID ${input.product_id} not found`);
        }

        const existingProduct = existingProducts[0];
        
        // Calculate new stock quantity
        const newStockQuantity = existingProduct.stock_quantity + input.quantity_change;
        
        // Ensure stock doesn't go below 0
        if (newStockQuantity < 0) {
            throw new Error(`Insufficient stock. Current stock: ${existingProduct.stock_quantity}, attempted change: ${input.quantity_change}`);
        }

        // Update the product with new stock quantity and updated timestamp
        const updatedProducts = await db.update(productsTable)
            .set({
                stock_quantity: newStockQuantity,
                updated_at: new Date()
            })
            .where(eq(productsTable.id, input.product_id))
            .returning()
            .execute();

        const updatedProduct = updatedProducts[0];
        
        // Convert numeric fields back to numbers for the response
        return {
            ...updatedProduct,
            price: parseFloat(updatedProduct.price)
        };
    } catch (error) {
        console.error('Stock update failed:', error);
        throw error;
    }
}