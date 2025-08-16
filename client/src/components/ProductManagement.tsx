import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import type { Product, CreateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  products: Product[];
  onProductCreate: (data: CreateProductInput) => Promise<void>;
  onProductUpdate: (id: number, data: Partial<CreateProductInput>) => Promise<void>;
  onProductDelete: (id: number) => Promise<void>;
  isLoading: boolean;
}

export function ProductManagement({
  products,
  onProductCreate,
  onProductUpdate,
  onProductDelete,
  isLoading
}: ProductManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for creating products
  const [createFormData, setCreateFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    price: 0,
    stock_quantity: 0,
    min_stock_threshold: 10
  });

  // Form state for editing products
  const [editFormData, setEditFormData] = useState<CreateProductInput>({
    name: '',
    description: null,
    price: 0,
    stock_quantity: 0,
    min_stock_threshold: 10
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onProductCreate(createFormData);
      setCreateFormData({
        name: '',
        description: null,
        price: 0,
        stock_quantity: 0,
        min_stock_threshold: 10
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsSubmitting(true);
    try {
      await onProductUpdate(editingProduct.id, editFormData);
      setIsEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock_quantity: product.stock_quantity,
      min_stock_threshold: product.min_stock_threshold
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await onProductDelete(id);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity <= 0) {
      return <Badge variant="destructive">Habis</Badge>;
    } else if (product.stock_quantity <= product.min_stock_threshold) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Menipis</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Tersedia</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📦 Manajemen Produk</h2>
          <p className="text-gray-600 mt-1">Kelola produk, harga, dan stok</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Tambah Produk Baru</DialogTitle>
                <DialogDescription>
                  Masukkan informasi produk yang ingin ditambahkan.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nama Produk *</Label>
                  <Input
                    id="create-name"
                    value={createFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Masukkan nama produk"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-description">Deskripsi</Label>
                  <Textarea
                    id="create-description"
                    value={createFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Deskripsi produk (opsional)"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-price">Harga (Rp) *</Label>
                    <Input
                      id="create-price"
                      type="number"
                      value={createFormData.price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateProductInput) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0
                        }))
                      }
                      placeholder="0"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="create-stock">Stok Awal *</Label>
                    <Input
                      id="create-stock"
                      type="number"
                      value={createFormData.stock_quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCreateFormData((prev: CreateProductInput) => ({
                          ...prev,
                          stock_quantity: parseInt(e.target.value) || 0
                        }))
                      }
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="create-threshold">Batas Minimum Stok</Label>
                  <Input
                    id="create-threshold"
                    type="number"
                    value={createFormData.min_stock_threshold}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateFormData((prev: CreateProductInput) => ({
                        ...prev,
                        min_stock_threshold: parseInt(e.target.value) || 10
                      }))
                    }
                    placeholder="10"
                    min="0"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Tambah Produk'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="text-center p-8 bg-gray-50">
          <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Belum ada produk. Tambahkan produk pertama Anda!</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    {product.description && (
                      <CardDescription className="mt-1">
                        {product.description}
                      </CardDescription>
                    )}
                  </div>
                  {getStockStatus(product)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Harga:</span>
                    <span className="font-semibold text-green-600">
                      Rp {product.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stok:</span>
                    <span className="font-semibold">
                      {product.stock_quantity} unit
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Min. Stok:</span>
                    <span className="text-sm text-gray-500">
                      {product.min_stock_threshold} unit
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(product)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus "{product.name}"? 
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(product.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Produk</DialogTitle>
              <DialogDescription>
                Perbarui informasi produk "{editingProduct?.name}".
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nama Produk *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">Deskripsi</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditFormData((prev: CreateProductInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Harga (Rp) *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    value={editFormData.price}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: CreateProductInput) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0
                      }))
                    }
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stok</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    value={editFormData.stock_quantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditFormData((prev: CreateProductInput) => ({
                        ...prev,
                        stock_quantity: parseInt(e.target.value) || 0
                      }))
                    }
                    min="0"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-threshold">Batas Minimum Stok</Label>
                <Input
                  id="edit-threshold"
                  type="number"
                  value={editFormData.min_stock_threshold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditFormData((prev: CreateProductInput) => ({
                      ...prev,
                      min_stock_threshold: parseInt(e.target.value) || 10
                    }))
                  }
                  min="0"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}