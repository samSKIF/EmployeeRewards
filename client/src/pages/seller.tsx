import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import ProductTable from '@/components/seller/ProductTable';
import OrdersTable from '@/components/seller/OrdersTable';
import AnalyticsSummary from '@/components/seller/AnalyticsSummary';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const Seller = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    category: '',
    points: '',
    imageUrl: '',
    supplier: '',
  });

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProductMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/products', {
        ...productData,
        points: parseInt(productData.points),
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      toast({
        title: 'Product created',
        description: 'The product has been created successfully.',
      });
      setIsAddProductDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create product',
        description:
          error.message || 'There was an error creating the product.',
      });
    },
  });

  const resetForm = () => {
    setProductData({
      name: '',
      description: '',
      category: '',
      points: '',
      imageUrl: '',
      supplier: '',
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate();
  };

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Seller Center</h1>
        <div className="mt-3 md:mt-0">
          <Button onClick={() => setIsAddProductDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add New Product
          </Button>
        </div>
      </div>

      {/* Seller Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tabs
          defaultValue="products"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="border-b border-gray-200">
            <TabsList className="h-auto">
              <TabsTrigger
                value="products"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                Products
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                Orders
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:border-primary data-[state=active]:border-b-2 py-4 px-6 rounded-none transition-none"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="products">
            <ProductTable />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersTable />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsSummary />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Product Dialog */}
      <Dialog
        open={isAddProductDialogOpen}
        onOpenChange={setIsAddProductDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Create a new product to offer in the rewards shop.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={productData.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={productData.description}
                    onChange={handleInputChange}
                    placeholder="Enter product description"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={productData.category}
                    onValueChange={(value) =>
                      handleSelectChange('category', value)
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gift Cards">Gift Cards</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Experiences">Experiences</SelectItem>
                      <SelectItem value="Wellness">Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    name="points"
                    type="number"
                    value={productData.points}
                    onChange={handleInputChange}
                    placeholder="Enter points value"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select
                    value={productData.supplier}
                    onValueChange={(value) =>
                      handleSelectChange('supplier', value)
                    }
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tillo">Tillo (Gift Cards)</SelectItem>
                      <SelectItem value="carlton">
                        Carlton (Physical Products)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={productData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="Enter image URL"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddProductDialogOpen(false)}
                disabled={createProductMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending
                  ? 'Creating...'
                  : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Seller;
