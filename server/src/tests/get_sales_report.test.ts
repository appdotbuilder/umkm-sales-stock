import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type SalesReportInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

describe('getSalesReport', () => {
  beforeEach(async () => {
    await resetDB();
    await createDB();
  });

  // Helper function to create test data
  const createTestData = async () => {
    // Create products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          description: 'Test product A',
          price: '100.00',
          stock_quantity: 50,
          min_stock_threshold: 10
        },
        {
          name: 'Product B',
          description: 'Test product B',
          price: '200.00',
          stock_quantity: 30,
          min_stock_threshold: 5
        }
      ])
      .returning()
      .execute();

    // Create transactions on different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    const transactions = await db.insert(salesTransactionsTable)
      .values([
        {
          transaction_date: twoDaysAgo,
          total_amount: '300.00',
          notes: 'Transaction 1'
        },
        {
          transaction_date: yesterday,
          total_amount: '500.00',
          notes: 'Transaction 2'
        },
        {
          transaction_date: today,
          total_amount: '400.00',
          notes: 'Transaction 3'
        }
      ])
      .returning()
      .execute();

    // Create transaction items
    await db.insert(salesTransactionItemsTable)
      .values([
        // Transaction 1 items
        {
          transaction_id: transactions[0].id,
          product_id: products[0].id,
          product_name: 'Product A',
          quantity: 2,
          unit_price: '100.00',
          subtotal: '200.00'
        },
        {
          transaction_id: transactions[0].id,
          product_id: products[1].id,
          product_name: 'Product B',
          quantity: 1,
          unit_price: '100.00',
          subtotal: '100.00'
        },
        // Transaction 2 items
        {
          transaction_id: transactions[1].id,
          product_id: products[0].id,
          product_name: 'Product A',
          quantity: 3,
          unit_price: '100.00',
          subtotal: '300.00'
        },
        {
          transaction_id: transactions[1].id,
          product_id: products[1].id,
          product_name: 'Product B',
          quantity: 1,
          unit_price: '200.00',
          subtotal: '200.00'
        },
        // Transaction 3 items
        {
          transaction_id: transactions[2].id,
          product_id: products[0].id,
          product_name: 'Product A',
          quantity: 4,
          unit_price: '100.00',
          subtotal: '400.00'
        }
      ])
      .execute();

    return { products, transactions };
  };

  it('should generate daily report correctly', async () => {
    await createTestData();

    const today = new Date();
    const input: SalesReportInput = {
      period: 'daily',
      start_date: today.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.period).toBe('daily');
    expect(result.start_date).toBe(today.toISOString().split('T')[0]);
    expect(result.end_date).toBe(today.toISOString().split('T')[0]);

    // Check summary
    expect(result.summary.total_transactions).toBe(1);
    expect(result.summary.total_revenue).toBe(400);
    expect(result.summary.total_items_sold).toBe(4);
    expect(result.summary.average_transaction_value).toBe(400);

    // Check period data
    expect(result.data).toHaveLength(1);
    expect(result.data[0].date).toBe(today.toISOString().split('T')[0]);
    expect(result.data[0].total_transactions).toBe(1);
    expect(result.data[0].total_revenue).toBe(400);
    expect(result.data[0].total_items_sold).toBe(4);
  });

  it('should generate weekly report correctly', async () => {
    const { transactions } = await createTestData();

    // Use the actual date from the earliest transaction to ensure all data is captured
    const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())));
    earliestDate.setDate(earliestDate.getDate() - 1); // Go back one more day to be safe

    const input: SalesReportInput = {
      period: 'weekly',
      start_date: earliestDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.period).toBe('weekly');
    expect(result.summary.total_transactions).toBe(3);
    expect(result.summary.total_revenue).toBe(1200);
    expect(result.summary.total_items_sold).toBe(11);
    expect(result.summary.average_transaction_value).toBe(400);
  });

  it('should generate monthly report correctly', async () => {
    const { transactions } = await createTestData();

    // Use the actual date from the earliest transaction to ensure all data is captured
    const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())));
    earliestDate.setDate(1); // First day of the month containing the earliest transaction

    const input: SalesReportInput = {
      period: 'monthly',
      start_date: earliestDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.period).toBe('monthly');
    expect(result.summary.total_transactions).toBe(3);
    expect(result.summary.total_revenue).toBe(1200);
    expect(result.summary.total_items_sold).toBe(11);
  });

  it('should handle custom date range correctly', async () => {
    const { transactions } = await createTestData();

    // Use the actual transaction dates from our test data
    const transactionDates = transactions.map(t => new Date(t.transaction_date));
    const latestDate = new Date(Math.max(...transactionDates.map(d => d.getTime())));
    const secondLatestDate = new Date([...transactionDates].sort((a, b) => b.getTime() - a.getTime())[1]);

    const input: SalesReportInput = {
      period: 'daily',
      start_date: secondLatestDate.toISOString().split('T')[0],
      end_date: latestDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.start_date).toBe(secondLatestDate.toISOString().split('T')[0]);
    expect(result.end_date).toBe(latestDate.toISOString().split('T')[0]);
    expect(result.summary.total_transactions).toBe(2); // Two most recent transactions
    expect(result.summary.total_revenue).toBe(900); // 500 + 400
    expect(result.summary.total_items_sold).toBe(8); // 4 + 4
  });

  it('should handle empty date range correctly', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const input: SalesReportInput = {
      period: 'daily',
      start_date: futureDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.summary.total_transactions).toBe(0);
    expect(result.summary.total_revenue).toBe(0);
    expect(result.summary.total_items_sold).toBe(0);
    expect(result.summary.average_transaction_value).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  it('should generate yearly report correctly', async () => {
    const { transactions } = await createTestData();

    // Use the actual date from the earliest transaction to ensure all data is captured
    const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())));
    earliestDate.setMonth(0, 1); // January 1st of the year containing the earliest transaction

    const input: SalesReportInput = {
      period: 'yearly',
      start_date: earliestDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    expect(result.period).toBe('yearly');
    expect(result.summary.total_transactions).toBe(3);
    expect(result.summary.total_revenue).toBe(1200);
    expect(result.summary.total_items_sold).toBe(11);
    expect(result.summary.average_transaction_value).toBe(400);
  });

  it('should handle numeric conversions correctly', async () => {
    const { transactions } = await createTestData();

    // Use the latest transaction date to ensure we have data
    const latestDate = new Date(Math.max(...transactions.map(t => new Date(t.transaction_date).getTime())));
    const input: SalesReportInput = {
      period: 'daily',
      start_date: latestDate.toISOString().split('T')[0]
    };

    const result = await getSalesReport(input);

    // Verify all numeric fields are proper numbers
    expect(typeof result.summary.total_transactions).toBe('number');
    expect(typeof result.summary.total_revenue).toBe('number');
    expect(typeof result.summary.total_items_sold).toBe('number');
    expect(typeof result.summary.average_transaction_value).toBe('number');

    result.data.forEach(item => {
      expect(typeof item.total_transactions).toBe('number');
      expect(typeof item.total_revenue).toBe('number');
      expect(typeof item.total_items_sold).toBe('number');
    });
  });

  it('should handle date formatting correctly', async () => {
    await createTestData();

    const testDate = '2023-12-15';
    const input: SalesReportInput = {
      period: 'daily',
      start_date: testDate
    };

    const result = await getSalesReport(input);

    // Verify date format (YYYY-MM-DD)
    expect(result.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.end_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    result.data.forEach(item => {
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});