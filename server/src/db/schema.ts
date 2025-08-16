import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  price: numeric('price', { precision: 12, scale: 2 }).notNull(), // IDR currency with 2 decimal places
  stock_quantity: integer('stock_quantity').notNull().default(0),
  min_stock_threshold: integer('min_stock_threshold').notNull().default(10), // Alert when stock is below this
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sales transactions table
export const salesTransactionsTable = pgTable('sales_transactions', {
  id: serial('id').primaryKey(),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  total_amount: numeric('total_amount', { precision: 15, scale: 2 }).notNull(), // Total transaction value
  notes: text('notes'), // Optional notes about the transaction
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Sales transaction items table (products sold in each transaction)
export const salesTransactionItemsTable = pgTable('sales_transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  product_name: text('product_name').notNull(), // Store product name at time of sale for historical records
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 12, scale: 2 }).notNull(), // Price per unit at time of sale
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull(), // quantity * unit_price
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relationships between tables
export const productsRelations = relations(productsTable, ({ many }) => ({
  salesItems: many(salesTransactionItemsTable)
}));

export const salesTransactionsRelations = relations(salesTransactionsTable, ({ many }) => ({
  items: many(salesTransactionItemsTable)
}));

export const salesTransactionItemsRelations = relations(salesTransactionItemsTable, ({ one }) => ({
  transaction: one(salesTransactionsTable, {
    fields: [salesTransactionItemsTable.transaction_id],
    references: [salesTransactionsTable.id]
  }),
  product: one(productsTable, {
    fields: [salesTransactionItemsTable.product_id],
    references: [productsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type SalesTransaction = typeof salesTransactionsTable.$inferSelect;
export type NewSalesTransaction = typeof salesTransactionsTable.$inferInsert;

export type SalesTransactionItem = typeof salesTransactionItemsTable.$inferSelect;
export type NewSalesTransactionItem = typeof salesTransactionItemsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  products: productsTable,
  salesTransactions: salesTransactionsTable,
  salesTransactionItems: salesTransactionItemsTable
};