import { z } from 'zod';

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(), // Price in IDR (stored as numeric in DB)
  stock_quantity: z.number().int(),
  min_stock_threshold: z.number().int(), // Threshold for low stock warning
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Input schema for creating products
export const createProductInputSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().nullable().optional(),
  price: z.number().positive("Price must be positive"),
  stock_quantity: z.number().int().nonnegative("Stock quantity must be non-negative"),
  min_stock_threshold: z.number().int().nonnegative("Minimum stock threshold must be non-negative").default(10)
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  min_stock_threshold: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Sales transaction schemas
export const salesTransactionSchema = z.object({
  id: z.number(),
  transaction_date: z.coerce.date(),
  total_amount: z.number(), // Total transaction amount
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type SalesTransaction = z.infer<typeof salesTransactionSchema>;

// Sales transaction items (products sold in a transaction)
export const salesTransactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  product_name: z.string(), // Store product name at time of sale
  quantity: z.number().int().positive(),
  unit_price: z.number(), // Price per unit at time of sale
  subtotal: z.number(), // quantity * unit_price
  created_at: z.coerce.date()
});

export type SalesTransactionItem = z.infer<typeof salesTransactionItemSchema>;

// Input schema for creating sales transactions
export const createSalesTransactionInputSchema = z.object({
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive("Quantity must be positive")
  })).min(1, "At least one item is required"),
  notes: z.string().nullable().optional()
});

export type CreateSalesTransactionInput = z.infer<typeof createSalesTransactionInputSchema>;

// Sales report schemas
export const salesReportPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type SalesReportPeriod = z.infer<typeof salesReportPeriodSchema>;

export const salesReportInputSchema = z.object({
  period: salesReportPeriodSchema,
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional()
});

export type SalesReportInput = z.infer<typeof salesReportInputSchema>;

export const salesReportItemSchema = z.object({
  date: z.string(),
  total_transactions: z.number().int(),
  total_revenue: z.number(),
  total_items_sold: z.number().int()
});

export type SalesReportItem = z.infer<typeof salesReportItemSchema>;

export const salesReportSchema = z.object({
  period: salesReportPeriodSchema,
  start_date: z.string(),
  end_date: z.string(),
  summary: z.object({
    total_transactions: z.number().int(),
    total_revenue: z.number(),
    total_items_sold: z.number().int(),
    average_transaction_value: z.number()
  }),
  data: z.array(salesReportItemSchema)
});

export type SalesReport = z.infer<typeof salesReportSchema>;

// Low stock item schema
export const lowStockItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  current_stock: z.number().int(),
  min_stock_threshold: z.number().int(),
  difference: z.number().int() // How many units below threshold
});

export type LowStockItem = z.infer<typeof lowStockItemSchema>;

// Product with sales data
export const productWithSalesSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock_quantity: z.number().int(),
  min_stock_threshold: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  total_sold: z.number().int(), // Total quantity sold
  total_revenue: z.number() // Total revenue from this product
});

export type ProductWithSales = z.infer<typeof productWithSalesSchema>;

// Complete transaction with items
export const transactionWithItemsSchema = z.object({
  id: z.number(),
  transaction_date: z.coerce.date(),
  total_amount: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  items: z.array(salesTransactionItemSchema)
});

export type TransactionWithItems = z.infer<typeof transactionWithItemsSchema>;