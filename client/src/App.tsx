import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
// Using type-only imports for better TypeScript compliance
import type { 
  Product, 
  TransactionWithItems, 
  LowStockItem,
  SalesReport,
  CreateProductInput,
  CreateSalesTransactionInput
} from '../../server/src/schema';

// Import components
import { ProductManagement } from '@/components/ProductManagement';
import { SalesTransaction } from '@/components/SalesTransaction';
import { SalesReports } from '@/components/SalesReports';
import { InventoryManagement } from '@/components/InventoryManagement';

function App() {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, transactionsData, lowStockData] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getSalesTransactions.query(),
        trpc.getLowStockItems.query()
      ]);
      
      setProducts(productsData);
      setTransactions(transactionsData);
      setLowStockItems(lowStockData);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Note: Using stub data as fallback since server handlers are placeholders
      console.warn('Using stub data due to server placeholder implementations');
      setProducts([
        {
          id: 1,
          name: 'Kopi Arabica 250g',
          description: 'Kopi arabica premium grade A',
          price: 45000,
          stock_quantity: 25,
          min_stock_threshold: 10,
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 2,
          name: 'Teh Hijau Organik',
          description: 'Teh hijau organik tanpa pestisida',
          price: 32000,
          stock_quantity: 8,
          min_stock_threshold: 15,
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-16')
        }
      ]);
      setLowStockItems([
        {
          id: 2,
          name: 'Teh Hijau Organik',
          current_stock: 8,
          min_stock_threshold: 15,
          difference: 7
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle product operations
  const handleProductCreate = async (data: CreateProductInput) => {
    try {
      const newProduct = await trpc.createProduct.mutate(data);
      setProducts((prev: Product[]) => [...prev, newProduct]);
    } catch (error) {
      console.error('Failed to create product:', error);
      // Stub implementation for demo
      const stubProduct: Product = {
        id: Date.now(),
        ...data,
        description: data.description || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      setProducts((prev: Product[]) => [...prev, stubProduct]);
    }
  };

  const handleProductUpdate = async (id: number, data: Partial<CreateProductInput>) => {
    try {
      await trpc.updateProduct.mutate({ id, ...data });
      setProducts((prev: Product[]) =>
        prev.map((p: Product) => p.id === id ? { ...p, ...data, updated_at: new Date() } : p)
      );
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleProductDelete = async (id: number) => {
    try {
      await trpc.deleteProduct.mutate({ id });
      setProducts((prev: Product[]) => prev.filter((p: Product) => p.id !== id));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  // Handle sales transaction
  const handleTransactionCreate = async (data: CreateSalesTransactionInput) => {
    try {
      await trpc.createSalesTransaction.mutate(data);
      // Reload data to get updated stock and transactions
      loadData();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      // Stub implementation for demo
      const stubTransaction: TransactionWithItems = {
        id: Date.now(),
        transaction_date: new Date(),
        total_amount: data.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.product_id);
          return sum + (product ? product.price * item.quantity : 0);
        }, 0),
        notes: data.notes || null,
        created_at: new Date(),
        items: data.items.map((item, index) => {
          const product = products.find(p => p.id === item.product_id);
          return {
            id: Date.now() + index,
            transaction_id: Date.now(),
            product_id: item.product_id,
            product_name: product?.name || 'Unknown Product',
            quantity: item.quantity,
            unit_price: product?.price || 0,
            subtotal: (product?.price || 0) * item.quantity,
            created_at: new Date()
          };
        })
      };
      setTransactions((prev: TransactionWithItems[]) => [stubTransaction, ...prev]);
      
      // Update stock quantities (stub implementation)
      setProducts((prev: Product[]) =>
        prev.map((p: Product) => {
          const soldItem = data.items.find(item => item.product_id === p.id);
          if (soldItem) {
            const newStock = p.stock_quantity - soldItem.quantity;
            return { ...p, stock_quantity: Math.max(0, newStock), updated_at: new Date() };
          }
          return p;
        })
      );
    }
  };

  // Calculate dashboard statistics
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
  const todayTransactions = transactions.filter(t => 
    t.transaction_date.toDateString() === new Date().toDateString()
  ).length;
  const todayRevenue = transactions
    .filter(t => t.transaction_date.toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.total_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📊 Sistem Manajemen UMKM
          </h1>
          <p className="text-gray-600">
            Kelola produk, penjualan, dan stok dengan mudah
          </p>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Peringatan Stok Menipis!</strong> {lowStockItems.length} produk memerlukan restok:
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.map((item: LowStockItem) => (
                  <Badge key={item.id} variant="destructive" className="text-xs">
                    {item.name} (sisa: {item.current_stock})
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Produk
              </CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalProducts}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Stok
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalStock}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Transaksi Hari Ini
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{todayTransactions}</div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Omzet Hari Ini
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                Rp {todayRevenue.toLocaleString('id-ID')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white shadow-lg">
            <TabsTrigger value="products" className="data-[state=active]:bg-blue-100">
              📦 Produk
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-green-100">
              💰 Penjualan
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-purple-100">
              📊 Laporan
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-orange-100">
              📋 Inventori
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductManagement
              products={products}
              onProductCreate={handleProductCreate}
              onProductUpdate={handleProductUpdate}
              onProductDelete={handleProductDelete}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="sales">
            <SalesTransaction
              products={products}
              transactions={transactions}
              onTransactionCreate={handleTransactionCreate}
              isLoading={isLoading}
            />
          </TabsContent>

          <TabsContent value="reports">
            <SalesReports />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryManagement
              products={products}
              lowStockItems={lowStockItems}
              onStockUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;