import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
import {
  createProductInputSchema,
  updateProductInputSchema,
  createSalesTransactionInputSchema,
  salesReportInputSchema
} from './schema';

// Import all handlers
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { getProductById } from './handlers/get_product_by_id';
import { createSalesTransaction } from './handlers/create_sales_transaction';
import { getSalesTransactions } from './handlers/get_sales_transactions';
import { getTransactionById } from './handlers/get_transaction_by_id';
import { getSalesReport } from './handlers/get_sales_report';
import { getLowStockItems } from './handlers/get_low_stock_items';
import { updateStock } from './handlers/update_stock';
import { getProductsWithSales } from './handlers/get_products_with_sales';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Product management routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .query(() => getProducts()),

  getProductById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  deleteProduct: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),

  // Sales transaction routes
  createSalesTransaction: publicProcedure
    .input(createSalesTransactionInputSchema)
    .mutation(({ input }) => createSalesTransaction(input)),

  getSalesTransactions: publicProcedure
    .query(() => getSalesTransactions()),

  getTransactionById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getTransactionById(input.id)),

  // Sales reporting routes
  getSalesReport: publicProcedure
    .input(salesReportInputSchema)
    .query(({ input }) => getSalesReport(input)),

  // Inventory management routes
  getLowStockItems: publicProcedure
    .query(() => getLowStockItems()),

  updateStock: publicProcedure
    .input(z.object({
      product_id: z.number(),
      quantity_change: z.number(),
      reason: z.string().optional()
    }))
    .mutation(({ input }) => updateStock(input)),

  getProductsWithSales: publicProcedure
    .query(() => getProductsWithSales()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`UMKM Management API server listening at port: ${port}`);
}

start();