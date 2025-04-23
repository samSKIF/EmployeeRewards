import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import ProductCard from "@/components/shop/ProductCard";
import { Product } from "@shared/schema";
import { ProductWithAvailable } from "@shared/types";
import { Button } from "@/components/ui/button";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ["/api/points/balance"],
  });

  // Fetch products with availability
  const { data: products, isLoading } = useQuery<ProductWithAvailable[]>({
    queryKey: ["/api/catalog"],
  });

  // Extract categories from products
  useEffect(() => {
    if (products) {
      const uniqueCategories = [...new Set(products.map(product => product.category))];
      setCategories(uniqueCategories);
    }
  }, [products]);

  // Filter products by category
  const filteredProducts = products
    ? selectedCategory === "all"
      ? products
      : products.filter(product => product.category === selectedCategory)
    : [];

  // Separate top picks (products with high value or popular items)
  // For this demo, we'll just show products over 500 points if the user has enough points
  const userHasEnoughPoints = (balanceData?.balance || 0) >= 500;
  const topPicks = userHasEnoughPoints 
    ? filteredProducts.filter(product => product.points >= 500)
    : [];
  
  // Regular products (excluding top picks if they're shown)
  const regularProducts = userHasEnoughPoints
    ? filteredProducts.filter(product => product.points < 500)
    : filteredProducts;

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reward Shop</h1>
        <div className="mt-3 md:mt-0 bg-gray-100 rounded-lg py-2 px-4">
          <span className="text-sm font-medium text-gray-800">
            Your balance: <span className="text-primary font-bold">{balanceData?.balance || 0}</span> points
          </span>
        </div>
      </div>

      {/* Top Picks Section (shows if user has >500 points) */}
      {userHasEnoughPoints && topPicks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Top Picks For You</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topPicks.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                balance={balanceData?.balance || 0} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Categories Section */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* All Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
                <div className="h-8 flex justify-between items-center pt-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : regularProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {regularProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              balance={balanceData?.balance || 0} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">
            {selectedCategory === "all" 
              ? "There are no products available in the shop yet." 
              : `No products found in the "${selectedCategory}" category.`}
          </p>
        </div>
      )}
    </MainLayout>
  );
};

export default Shop;
