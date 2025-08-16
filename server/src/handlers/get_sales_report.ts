import { db } from '../db';
import { salesTransactionsTable, salesTransactionItemsTable } from '../db/schema';
import { type SalesReportInput, type SalesReport } from '../schema';
import { between, gte, lte, sum, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export const getSalesReport = async (input: SalesReportInput): Promise<SalesReport> => {
  try {
    const startDate = new Date(input.start_date);
    let endDate: Date;

    // Calculate end_date if not provided based on period
    if (input.end_date) {
      endDate = new Date(input.end_date);
      // Ensure end date includes the full day
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(startDate);
      switch (input.period) {
        case 'daily':
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'weekly':
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + 1);
          endDate.setDate(0); // Last day of the month
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'yearly':
          endDate.setFullYear(startDate.getFullYear() + 1);
          endDate.setDate(0); // Last day of the year
          endDate.setHours(23, 59, 59, 999);
          break;
      }
    }

    // Query for summary statistics using raw SQL to ensure correct DISTINCT counting
    const summaryResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT st.id) as total_transactions,
        COALESCE(SUM(DISTINCT st.total_amount), 0) as total_revenue,
        COALESCE(SUM(sti.quantity), 0) as total_items_sold
      FROM sales_transactions st
      INNER JOIN sales_transaction_items sti ON st.id = sti.transaction_id
      WHERE st.transaction_date >= ${startDate} AND st.transaction_date <= ${endDate}
    `);

    const summary = summaryResult.rows[0] as any;
    const totalTransactions = Number(summary.total_transactions) || 0;
    const totalRevenue = parseFloat(summary.total_revenue || '0');
    const totalItemsSold = Number(summary.total_items_sold) || 0;
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Query for period-based data
    let groupByClause: string;
    let dateFormat: string;

    switch (input.period) {
      case 'daily':
        groupByClause = "DATE(transaction_date)";
        dateFormat = "YYYY-MM-DD";
        break;
      case 'weekly':
        groupByClause = "DATE_TRUNC('week', transaction_date)";
        dateFormat = "YYYY-MM-DD";
        break;
      case 'monthly':
        groupByClause = "DATE_TRUNC('month', transaction_date)";
        dateFormat = "YYYY-MM-DD";
        break;
      case 'yearly':
        groupByClause = "DATE_TRUNC('year', transaction_date)";
        dateFormat = "YYYY-MM-DD";
        break;
    }

    const periodDataResult = await db.execute(sql`
      SELECT 
        ${sql.raw(groupByClause)} as period_date,
        COUNT(DISTINCT st.id) as total_transactions,
        COALESCE(SUM(st.total_amount), 0) as total_revenue,
        COALESCE(SUM(sti.quantity), 0) as total_items_sold
      FROM sales_transactions st
      INNER JOIN sales_transaction_items sti ON st.id = sti.transaction_id
      WHERE st.transaction_date >= ${startDate} AND st.transaction_date <= ${endDate}
      GROUP BY ${sql.raw(groupByClause)}
      ORDER BY period_date ASC
    `);

    const data = periodDataResult.rows.map((row: any) => ({
      date: new Date(row.period_date).toISOString().split('T')[0], // Format as YYYY-MM-DD
      total_transactions: Number(row.total_transactions),
      total_revenue: parseFloat(row.total_revenue),
      total_items_sold: Number(row.total_items_sold)
    }));

    return {
      period: input.period,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      summary: {
        total_transactions: totalTransactions,
        total_revenue: totalRevenue,
        total_items_sold: totalItemsSold,
        average_transaction_value: averageTransactionValue
      },
      data
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
};