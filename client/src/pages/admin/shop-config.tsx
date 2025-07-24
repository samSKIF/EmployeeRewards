import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  ShoppingBag,
  Package,
  Tag,
  Grid3X3,
} from 'lucide-react';

// Define shop configuration schema
const shopConfigSchema = z.object({
  shopEnabled: z.boolean(),
  allowCustomPricing: z.boolean(),
  defaultCurrency: z.string(),
  pointToCurrencyRatio: z.coerce.number().positive(),
  processingTimeInDays: z.coerce.number().int().positive(),
  shippingTimeInDays: z.coerce.number().int().positive(),
  categoryOrder: z.array(z.string()).optional(),
  productVerification: z.boolean(),
  customCSS: z.string().optional(),
});

type ShopConfigFormValues = z.infer<typeof shopConfigSchema>;

// Define product schema
const productSchema = z.object({
  name: z.string().min(2, {
    message: 'Product name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  price: z.coerce.number().positive({
    message: 'Price must be a positive number.',
  }),
  imageUrl: z
    .string()
    .url({
      message: 'Please enter a valid URL for the image.',
    })
    .optional(),
  categoryId: z.string(),
  isActive: z.boolean().default(true),
  inStock: z.boolean().default(true),
  brandedProduct: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productSchema>;

const ShopConfigPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch shop configuration
  const { data: shopConfig, isLoading: configLoading } = useQuery({
    queryKey: ['/api/shop/config'],
    staleTime: 60000, // 1 minute
  });

  // Fetch product categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/catalog'],
    staleTime: 60000, // 1 minute
    select: (data) => data?.categories || [],
  });

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/catalog'],
    staleTime: 60000, // 1 minute
    select: (data) => {
      // Combine all products from all categories
      return (
        data?.categories?.flatMap((category) =>
          category.products.map((product) => ({
            ...product,
            categoryName: category.name,
            categoryId: category.id,
          }))
        ) || []
      );
    },
  });

  // Shop configuration form
  const shopConfigForm = useForm<ShopConfigFormValues>({
    resolver: zodResolver(shopConfigSchema),
    defaultValues: {
      shopEnabled: true,
      allowCustomPricing: false,
      defaultCurrency: 'USD',
      pointToCurrencyRatio: 100,
      processingTimeInDays: 1,
      shippingTimeInDays: 3,
      categoryOrder: [],
      productVerification: true,
      customCSS: '',
    },
  });

  // Product form
  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      categoryId: '',
      isActive: true,
      inStock: true,
      brandedProduct: false,
    },
  });

  // Update shop config form when data is loaded
  React.useEffect(() => {
    if (shopConfig) {
      shopConfigForm.reset({
        shopEnabled: shopConfig.shopEnabled ?? true,
        allowCustomPricing: shopConfig.allowCustomPricing ?? false,
        defaultCurrency: shopConfig.defaultCurrency || 'USD',
        pointToCurrencyRatio: shopConfig.pointToCurrencyRatio || 100,
        processingTimeInDays: shopConfig.processingTimeInDays || 1,
        shippingTimeInDays: shopConfig.shippingTimeInDays || 3,
        categoryOrder: shopConfig.categoryOrder || [],
        productVerification: shopConfig.productVerification ?? true,
        customCSS: shopConfig.customCSS || '',
      });
    }
  }, [shopConfig, shopConfigForm]);

  // Update product form when a product is selected for editing
  React.useEffect(() => {
    if (selectedProduct) {
      productForm.reset({
        name: selectedProduct.name,
        description: selectedProduct.description,
        price: selectedProduct.price,
        imageUrl: selectedProduct.imageUrl || '',
        categoryId: selectedProduct.categoryId,
        isActive: selectedProduct.isActive ?? true,
        inStock: selectedProduct.inStock ?? true,
        brandedProduct: selectedProduct.brandedProduct ?? false,
      });
    } else {
      productForm.reset({
        name: '',
        description: '',
        price: 0,
        imageUrl: '',
        categoryId: categories?.[0]?.id || '',
        isActive: true,
        inStock: true,
        brandedProduct: false,
      });
    }
  }, [selectedProduct, productForm, categories]);

  // Save shop configuration mutation
  const shopConfigMutation = useMutation({
    mutationFn: async (data: ShopConfigFormValues) => {
      const res = await apiRequest('POST', '/api/shop/config', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop/config'] });
      toast({
        title: 'Configuration saved',
        description: 'Shop configuration has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save product mutation
  const productMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      let url = '/api/products';
      let method = 'POST';

      if (selectedProduct) {
        url = `/api/products/${selectedProduct.id}`;
        method = 'PATCH';
      }

      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      setProductModalOpen(false);
      setSelectedProduct(null);

      toast({
        title: selectedProduct ? 'Product updated' : 'Product created',
        description: selectedProduct
          ? 'Product has been updated successfully.'
          : 'New product has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Operation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Refresh products mutation
  const refreshProductsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/products/refresh', {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
      toast({
        title: 'Catalog refreshed',
        description:
          'The product catalog has been refreshed with latest items.',
      });
      setRefreshLoading(false);
    },
    onError: (error) => {
      toast({
        title: 'Refresh failed',
        description: error.message,
        variant: 'destructive',
      });
      setRefreshLoading(false);
    },
  });

  // Handle shop config form submission
  const onSubmitShopConfig = (data: ShopConfigFormValues) => {
    shopConfigMutation.mutate(data);
  };

  // Handle product form submission
  const onSubmitProduct = (data: ProductFormValues) => {
    productMutation.mutate(data);
  };

  // Handle product edit
  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  // Handle refresh products
  const handleRefreshProducts = () => {
    setRefreshLoading(true);
    refreshProductsMutation.mutate();
  };

  // Loading state
  if (configLoading || categoriesLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Shop Configuration
          </h1>
          <Button
            onClick={handleRefreshProducts}
            disabled={refreshLoading}
            className="mt-4 sm:mt-0"
          >
            {refreshLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Catalog
              </>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid grid-cols-3 gap-4 w-full max-w-lg">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              <span>Categories</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Form {...shopConfigForm}>
              <form
                onSubmit={shopConfigForm.handleSubmit(onSubmitShopConfig)}
                className="space-y-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Shop Settings</CardTitle>
                    <CardDescription>
                      Configure the general settings for your reward shop.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={shopConfigForm.control}
                        name="shopEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel>Enable Shop</FormLabel>
                              <FormDescription>
                                Turn the reward shop on or off
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={shopConfigForm.control}
                        name="allowCustomPricing"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel>Custom Pricing</FormLabel>
                              <FormDescription>
                                Allow custom pricing for special products
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={shopConfigForm.control}
                        name="defaultCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Default Currency</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="CAD">CAD (C$)</SelectItem>
                                <SelectItem value="AUD">AUD (A$)</SelectItem>
                                <SelectItem value="JPY">JPY (¥)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Currency used for product pricing
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={shopConfigForm.control}
                        name="pointToCurrencyRatio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points to Currency Ratio</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormDescription>
                              How many points equal one unit of currency (e.g.,
                              100 points = $1)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={shopConfigForm.control}
                        name="processingTimeInDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Processing Time (Days)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormDescription>
                              Average time to process orders in days
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={shopConfigForm.control}
                        name="shippingTimeInDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shipping Time (Days)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormDescription>
                              Average time for order delivery in days
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <FormField
                      control={shopConfigForm.control}
                      name="productVerification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel>Product Verification</FormLabel>
                            <FormDescription>
                              Require admin verification for new products
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={shopConfigForm.control}
                      name="customCSS"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom CSS</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder=".shop-container { background-color: #f5f5f5; }"
                              className="font-mono"
                              rows={6}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Custom CSS to be applied to the shop (advanced)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={shopConfigMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {shopConfigMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </Form>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Product Management</CardTitle>
                    <CardDescription>
                      Manage products available in your reward shop.
                    </CardDescription>
                  </div>
                  <Dialog
                    open={productModalOpen}
                    onOpenChange={setProductModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setSelectedProduct(null);
                          productForm.reset({
                            name: '',
                            description: '',
                            price: 0,
                            imageUrl: '',
                            categoryId: categories?.[0]?.id || '',
                            isActive: true,
                            inStock: true,
                            brandedProduct: false,
                          });
                        }}
                        className="mt-4 sm:mt-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedProduct
                            ? 'Update the product information below.'
                            : 'Fill in the details for the new product.'}
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...productForm}>
                        <form
                          onSubmit={productForm.handleSubmit(onSubmitProduct)}
                          className="space-y-6"
                        >
                          <FormField
                            control={productForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Product Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={productForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea rows={4} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                              control={productForm.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (Points)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={productForm.control}
                              name="categoryId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {categories?.map((category) => (
                                        <SelectItem
                                          key={category.id}
                                          value={category.id}
                                        >
                                          {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={productForm.control}
                            name="imageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Image URL</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter a URL for the product image
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <FormField
                              control={productForm.control}
                              name="isActive"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                                  <FormLabel>Active</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={productForm.control}
                              name="inStock"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                                  <FormLabel>In Stock</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={productForm.control}
                              name="brandedProduct"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                                  <FormLabel>Branded</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <DialogFooter>
                            <Button
                              type="submit"
                              disabled={productMutation.isPending}
                            >
                              {productMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : selectedProduct ? (
                                'Update Product'
                              ) : (
                                'Add Product'
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : products?.length === 0 ? (
                  <Alert className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No products found</AlertTitle>
                    <AlertDescription>
                      There are no products in your shop yet. Add new products
                      or refresh the catalog.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                                <div>
                                  <div>{product.name}</div>
                                  {product.brandedProduct && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Branded
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{product.categoryName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {product.price} pts
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {product.isActive ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />{' '}
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  variant="destructive"
                                  className="bg-red-100 text-red-800"
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Inactive
                                </Badge>
                              )}
                              {!product.inStock && (
                                <Badge
                                  variant="outline"
                                  className="ml-1 bg-orange-100 text-orange-800"
                                >
                                  Out of Stock
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>
                  Manage product categories and their order in the shop.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : categories?.length === 0 ? (
                  <Alert className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No categories found</AlertTitle>
                    <AlertDescription>
                      There are no product categories in your shop yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {categories?.map((category) => (
                      <Card key={category.id}>
                        <CardHeader className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="bg-primary/10 p-2 rounded-md">
                                <Tag className="h-5 w-5 text-primary" />
                              </div>
                              <CardTitle className="text-lg">
                                {category.name}
                              </CardTitle>
                              <Badge variant="outline">
                                {category.products?.length || 0} products
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-sm text-gray-500">
                            {category.description || 'No description available'}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ShopConfigPage;
