import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, ShoppingCart, Trash2, Eye } from 'lucide-react';
import type { Product, TransactionWithItems, CreateSalesTransactionInput } from '../../../server/src/schema';

interface SalesTransactionProps {
  products: Product[];
  transactions: TransactionWithItems[];
  onTransactionCreate: (data: CreateSalesTransactionInput) => Promise<void>;
  isLoading: boolean;
}

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  available_stock: number;
}

export function SalesTransaction({
  products,
  transactions,
  onTransactionCreate,
  isLoading
}: SalesTransactionProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<TransactionWithItems | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const addToCart = () => {
    if (!selectedProductId) return;
    
    const productId = parseInt(selectedProductId);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if product is already in cart
    const existingItem = cart.find(item => item.product_id === productId);
    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock_quantity) {
        alert(`Stok tidak mencukupi! Stok tersedia: ${product.stock_quantity}`);
        return;
      }
      
      setCart((prev: CartItem[]) =>
        prev.map((item: CartItem) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: product.price * newQuantity
              }
            : item
        )
      );
    } else {
      // Add new item
      if (quantity > product.stock_quantity) {
        alert(`Stok tidak mencukupi! Stok tersedia: ${product.stock_quantity}`);
        return;
      }
      
      const newItem: CartItem = {
        product_id: productId,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        subtotal: product.price * quantity,
        available_stock: product.stock_quantity
      };
      
      setCart((prev: CartItem[]) => [...prev, newItem]);
    }
    
    setSelectedProductId('');
    setQuantity(1);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.product_id !== productId));
  };

  const updateCartQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (newQuantity > product.stock_quantity) {
      alert(`Stok tidak mencukupi! Stok tersedia: ${product.stock_quantity}`);
      return;
    }
    
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
              subtotal: item.unit_price * newQuantity
            }
          : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const transactionData: CreateSalesTransactionInput = {
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        notes: notes || null
      };
      
      await onTransactionCreate(transactionData);
      
      // Reset form
      setCart([]);
      setNotes('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewDialog = (transaction: TransactionWithItems) => {
    setViewingTransaction(transaction);
    setIsViewDialogOpen(true);
  };

  const availableProducts = products.filter(p => p.stock_quantity > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">💰 Transaksi Penjualan</h2>
          <p className="text-gray-600 mt-1">Catat penjualan dan lihat riwayat transaksi</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Transaksi Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Transaksi Penjualan Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan produk ke keranjang dan lakukan transaksi.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-6">
                {/* Add Product to Cart */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold mb-3">Tambah Produk ke Keranjang</h4>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map((product: Product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - Rp {product.price.toLocaleString('id-ID')} 
                              (Stok: {product.stock_quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setQuantity(parseInt(e.target.value) || 1)
                      }
                      placeholder="Qty"
                      min="1"
                      className="w-20"
                    />
                    <Button
                      type="button"
                      onClick={addToCart}
                      disabled={!selectedProductId}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Cart Items */}
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h4 className="font-semibold flex items-center">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Keranjang ({cart.length} item)
                    </h4>
                  </div>
                  
                  {cart.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Keranjang masih kosong
                    </div>
                  ) : (
                    <ScrollArea className="h-48">
                      <div className="p-4 space-y-3">
                        {cart.map((item: CartItem) => (
                          <div key={item.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-sm text-gray-600">
                                Rp {item.unit_price.toLocaleString('id-ID')} x {item.quantity}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  updateCartQuantity(item.product_id, parseInt(e.target.value) || 1)
                                }
                                className="w-16 text-center"
                                min="1"
                                max={item.available_stock}
                              />
                              <div className="font-semibold text-green-600 min-w-[80px] text-right">
                                Rp {item.subtotal.toLocaleString('id-ID')}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeFromCart(item.product_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  
                  {cart.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-green-600">
                          Rp {calculateTotal().toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Catatan (opsional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    placeholder="Tambahkan catatan untuk transaksi ini..."
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isSubmitting || cart.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Memproses...' : `Selesaikan Transaksi (Rp ${calculateTotal().toLocaleString('id-ID')})`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <CardDescription>
            Daftar transaksi penjualan yang telah dilakukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada transaksi. Buat transaksi pertama Anda!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction: TransactionWithItems) => (
                <div
                  key={transaction.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          #{transaction.id}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {transaction.transaction_date.toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="text-lg font-semibold text-green-600">
                        Rp {transaction.total_amount.toLocaleString('id-ID')}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {transaction.items.length} item • Total: {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} produk
                      </div>
                      
                      {transaction.notes && (
                        <div className="text-sm text-gray-600 italic">
                          "{transaction.notes}"
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(transaction)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Detail
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Transaction Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi #{viewingTransaction?.id}</DialogTitle>
            <DialogDescription>
              {viewingTransaction?.transaction_date.toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </DialogDescription>
          </DialogHeader>
          
          {viewingTransaction && (
            <div className="space-y-4">
              {/* Transaction Items */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-gray-50 font-semibold">
                  Produk yang Dibeli
                </div>
                <div className="space-y-3 p-3">
                  {viewingTransaction.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} x Rp {item.unit_price.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="font-semibold">
                        Rp {item.subtotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="p-3 bg-gray-50">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">
                      Rp {viewingTransaction.total_amount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingTransaction.notes && (
                <div className="border rounded-lg p-3">
                  <div className="font-semibold mb-2">Catatan:</div>
                  <div className="text-gray-700">{viewingTransaction.notes}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}