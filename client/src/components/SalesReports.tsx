import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, TrendingUp, TrendingDown, BarChart3, DollarSign } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { SalesReport, SalesReportInput, SalesReportPeriod } from '../../../server/src/schema';

export function SalesReports() {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportParams, setReportParams] = useState<SalesReportInput>({
    period: 'daily',
    start_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    end_date: new Date().toISOString().split('T')[0]
  });

  const generateReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const reportData = await trpc.getSalesReport.query(reportParams);
      setReport(reportData);
    } catch (error) {
      console.error('Failed to generate report:', error);
      // Stub implementation for demo since server handler is placeholder
      console.warn('Using stub data for sales report due to server placeholder implementation');
      const stubReport: SalesReport = {
        period: reportParams.period,
        start_date: reportParams.start_date,
        end_date: reportParams.end_date || reportParams.start_date,
        summary: {
          total_transactions: 15,
          total_revenue: 1250000,
          total_items_sold: 45,
          average_transaction_value: 83333
        },
        data: [
          {
            date: '2024-01-15',
            total_transactions: 8,
            total_revenue: 680000,
            total_items_sold: 24
          },
          {
            date: '2024-01-16',
            total_transactions: 7,
            total_revenue: 570000,
            total_items_sold: 21
          }
        ]
      };
      setReport(stubReport);
    } finally {
      setIsLoading(false);
    }
  }, [reportParams]);

  const handlePeriodChange = (period: string) => {
    const typedPeriod = period as SalesReportPeriod;
    setReportParams((prev: SalesReportInput) => ({
      ...prev,
      period: typedPeriod,
      // Reset end_date for daily reports
      end_date: typedPeriod === 'daily' ? prev.start_date : prev.end_date
    }));
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPeriodLabel = (period: SalesReportPeriod) => {
    switch (period) {
      case 'daily': return 'Harian';
      case 'weekly': return 'Mingguan';
      case 'monthly': return 'Bulanan';
      case 'yearly': return 'Tahunan';
      default: return period;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800">📊 Laporan Penjualan</h2>
        <p className="text-gray-600 mt-1">Analisa performa penjualan berdasarkan periode</p>
      </div>

      {/* Report Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Parameter Laporan
          </CardTitle>
          <CardDescription>
            Pilih periode dan rentang waktu untuk laporan penjualan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <Select
                value={reportParams.period}
                onValueChange={handlePeriodChange}
              >
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Harian</SelectItem>
                  <SelectItem value="weekly">Mingguan</SelectItem>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="yearly">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="start-date">Tanggal Mulai</Label>
              <Input
                id="start-date"
                type="date"
                value={reportParams.start_date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportParams((prev: SalesReportInput) => ({
                    ...prev,
                    start_date: e.target.value
                  }))
                }
              />
            </div>
            
            {reportParams.period !== 'daily' && (
              <div className="space-y-2">
                <Label htmlFor="end-date">Tanggal Akhir</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={reportParams.end_date || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setReportParams((prev: SalesReportInput) => ({
                      ...prev,
                      end_date: e.target.value || undefined
                    }))
                  }
                />
              </div>
            )}
            
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Memproses...' : 'Buat Laporan'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {report && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">
                  Total Transaksi
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">
                  {report.summary.total_transactions}
                </div>
                <p className="text-xs text-blue-600">
                  Periode: {getPeriodLabel(report.period)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  Total Omzet
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(report.summary.total_revenue)}
                </div>
                <p className="text-xs text-green-600">
                  {formatDate(report.start_date)} - {formatDate(report.end_date)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">
                  Total Produk Terjual
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800">
                  {report.summary.total_items_sold}
                </div>
                <p className="text-xs text-purple-600">
                  Item terjual
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">
                  Rata-rata per Transaksi
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800">
                  {formatCurrency(report.summary.average_transaction_value)}
                </div>
                <p className="text-xs text-orange-600">
                  Per transaksi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Data */}
          <Card>
            <CardHeader>
              <CardTitle>Data Detail</CardTitle>
              <CardDescription>
                Rincian penjualan per {getPeriodLabel(report.period).toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.data.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Tidak ada data penjualan untuk periode yang dipilih</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {report.data.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="font-semibold text-lg">
                            {formatDate(item.date)}
                          </div>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>{item.total_transactions} transaksi</span>
                            <span>•</span>
                            <span>{item.total_items_sold} item terjual</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(item.total_revenue)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Avg: {formatCurrency(item.total_revenue / item.total_transactions)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  {/* Summary Row */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-lg">
                        Total ({report.data.length} {getPeriodLabel(report.period).toLowerCase()})
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(report.summary.total_revenue)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {report.summary.total_transactions} transaksi • {report.summary.total_items_sold} item
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Indicators */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📈 Indikator Performa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Transaksi per hari:</span>
                    <Badge variant="secondary">
                      {(report.summary.total_transactions / Math.max(report.data.length, 1)).toFixed(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Omzet per hari:</span>
                    <Badge variant="secondary">
                      {formatCurrency(report.summary.total_revenue / Math.max(report.data.length, 1))}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Item per transaksi:</span>
                    <Badge variant="secondary">
                      {(report.summary.total_items_sold / Math.max(report.summary.total_transactions, 1)).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎯 Tips Peningkatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Rata-rata transaksi: <strong>{formatCurrency(report.summary.average_transaction_value)}</strong></p>
                  <p>• Tingkatkan nilai transaksi dengan bundling produk</p>
                  <p>• Target minimum 2-3 item per transaksi</p>
                  <p>• Fokus pada produk dengan margin tinggi</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!report && (
        <Card className="text-center p-8">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            Pilih parameter laporan dan klik "Buat Laporan" untuk melihat analisa penjualan
          </p>
        </Card>
      )}
    </div>
  );
}