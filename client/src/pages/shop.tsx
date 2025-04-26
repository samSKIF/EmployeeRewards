import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import ProductCard from "@/components/shop/ProductCard";
import { Product } from "@shared/schema";
import { ProductWithAvailable } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { LogOut, Search, CreditCard, Tag, Gift, Ticket, ShoppingBag, Home, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBranding } from "@/context/BrandingContext";
import { useFirebaseAuth } from "@/context/FirebaseAuthContext";

const Shop = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { branding } = useBranding();
  const { signOut } = useFirebaseAuth();

  // Fetch user balance
  const { data: balanceData = { balance: 0 } } = useQuery<{ balance: number }>({
    queryKey: ["/api/points/balance"],
  });

  // Fetch products with availability
  const { data: products = [], isLoading } = useQuery<ProductWithAvailable[]>({
    queryKey: ["/api/catalog"],
  });

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      // Remove Firebase token
      localStorage.removeItem("firebaseToken");
      
      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem("skipAutoLogin", "true");
      
      // Sign out from Firebase
      await signOut();
      
      // Redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Extract categories from products
  useEffect(() => {
    if (products) {
      const categoriesSet = new Set<string>();
      products.forEach(product => {
        if (product.category) {
          categoriesSet.add(product.category);
        }
      });
      setCategories(Array.from(categoriesSet));
    }
  }, [products]);

  // Filter products by category and search
  const filteredProducts = products
    ? selectedCategory === "all"
      ? products.filter(product => 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : products.filter(product => 
          product.category === selectedCategory && 
          (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           product.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    : [];

  // Separate featured items (premium products)
  const featuredItems = filteredProducts.filter(product => product.points >= 500 && product.points <= 1000);
  
  // Separate luxury items (very expensive products)
  const luxuryItems = filteredProducts.filter(product => product.points > 1000);
  
  // Regular products (excluding featured and luxury)
  const regularProducts = filteredProducts.filter(product => product.points < 500);

  // Get featured categories - we'll highlight specific categories like "Experiences" and "Gift Cards"
  const featuredCategoryProducts = {
    experiences: filteredProducts.filter(product => 
      product.category?.toLowerCase() === "experiences" || 
      product.category?.toLowerCase().includes("experience")),
    giftCards: filteredProducts.filter(product => 
      product.category?.toLowerCase() === "gift cards" || 
      product.category?.toLowerCase().includes("gift")),
    merchandise: filteredProducts.filter(product => 
      product.category?.toLowerCase() === "merchandise" || 
      product.category?.toLowerCase().includes("merch"))
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <header 
        className="sticky top-0 z-10 bg-white border-b shadow-sm p-4" 
        style={{
          background: branding?.primaryColor || "#4F46E5",
          color: "#fff"
        }}
      >
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <ShoppingBag className="h-6 w-6" />
            <h1 className="text-xl font-semibold">{branding?.organizationName || "ThrivioHR"} Reward Shop</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="bg-white/20 rounded-full px-4 py-2 flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="font-bold">{balanceData?.balance || 0} Points</span>
            </div>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={() => window.close()}
            >
              <Home className="h-4 w-4 mr-2" />
              Return to Social
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:bg-white/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and filter section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search rewards..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                style={selectedCategory === "all" && branding?.primaryColor ? 
                  { background: branding.primaryColor } : undefined}
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  style={selectedCategory === category && branding?.primaryColor ? 
                    { background: branding.primaryColor } : undefined}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="all" className="py-3">
              <ShoppingBag className="h-4 w-4 mr-2" />
              All Rewards
            </TabsTrigger>
            <TabsTrigger value="experiences" className="py-3">
              <Ticket className="h-4 w-4 mr-2" />
              Experiences
            </TabsTrigger>
            <TabsTrigger value="giftcards" className="py-3">
              <Gift className="h-4 w-4 mr-2" />
              Gift Cards
            </TabsTrigger>
            <TabsTrigger value="premium" className="py-3">
              <Award className="h-4 w-4 mr-2" />
              Premium Rewards
            </TabsTrigger>
          </TabsList>

          {/* All Rewards Tab */}
          <TabsContent value="all" className="space-y-8">
            {/* Featured Items Section */}
            {featuredItems.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                    style={{ 
                      background: `linear-gradient(to right, ${branding?.primaryColor || "#4F46E5"}, ${branding?.secondaryColor || "#A855F7"})`,
                      color: "#fff"
                     }}>
                    <Award className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Featured Rewards</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredItems.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      balance={balanceData?.balance || 0} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Products */}
            {regularProducts.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                    <Tag className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Popular Rewards</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {isLoading ? (
                    // Skeleton loader
                    Array(8).fill(0).map((_, i) => (
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
                    ))
                  ) : (
                    regularProducts.map(product => (
                      <ProductCard 
                        key={product.id} 
                        product={product} 
                        balance={balanceData?.balance || 0} 
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Luxury Items Section */}
            {luxuryItems.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                    <Award className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Premium Collection</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {luxuryItems.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      balance={balanceData?.balance || 0} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredProducts.length === 0 && !isLoading && (
              <Card className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No rewards found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery ? 
                    `We couldn't find any rewards matching "${searchQuery}"` :
                    selectedCategory === "all" ? 
                      "There are no rewards available in the shop yet." : 
                      `No rewards found in the "${selectedCategory}" category.`
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear Search
                  </Button>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Experiences Tab */}
          <TabsContent value="experiences">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <Ticket className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Experiences</h2>
              </div>
              
              {featuredCategoryProducts.experiences.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredCategoryProducts.experiences.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      balance={balanceData?.balance || 0} 
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">No experiences available</h3>
                  <p className="text-gray-500">Check back soon for exciting experiences!</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Gift Cards Tab */}
          <TabsContent value="giftcards">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                  <Gift className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Gift Cards</h2>
              </div>
              
              {featuredCategoryProducts.giftCards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {featuredCategoryProducts.giftCards.map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      balance={balanceData?.balance || 0} 
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">No gift cards available</h3>
                  <p className="text-gray-500">Check back soon for gift card options!</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Premium Rewards Tab */}
          <TabsContent value="premium">
            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
                  <Award className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Premium Rewards</h2>
              </div>
              
              {[...featuredItems, ...luxuryItems].length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...featuredItems, ...luxuryItems].map(product => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      balance={balanceData?.balance || 0} 
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-2">No premium rewards available</h3>
                  <p className="text-gray-500">Check back soon for premium reward options!</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">{branding?.organizationName || "ThrivioHR"}</h3>
              <p className="text-sm text-gray-400">© {new Date().getFullYear()} All rights reserved</p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm hover:text-white">Terms &amp; Conditions</a>
              <a href="#" className="text-sm hover:text-white">Privacy Policy</a>
              <a href="#" className="text-sm hover:text-white">Contact Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Shop;
