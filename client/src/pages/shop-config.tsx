
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState("design1");
  const [shopConfig, setShopConfig] = useState({
    enableCashCheckout: false,
    enablePointsCheckout: true,
    enableMixedCheckout: false,
    categories: {
      giftCards: true,
      electronics: true,
      experiences: true
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/shop/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shop configuration saved successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    }
  });

  const saveConfig = (section: string) => {
    let configData;
    switch(section) {
      case 'brand':
        configData = {
          design: selectedDesign,
          colorScheme: shopConfig.colorScheme
        };
        break;
      case 'categories':
        configData = {
          categories: shopConfig.categories
        };
        break;
      case 'misc':
        configData = {
          enableCashCheckout: shopConfig.enableCashCheckout,
          enablePointsCheckout: shopConfig.enablePointsCheckout,
          enableMixedCheckout: shopConfig.enableMixedCheckout
        };
        break;
      default:
        return;
    }
    
    saveConfigMutation.mutate(configData);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Shop Configuration</h1>

        <Tabs defaultValue="brand">
          <TabsList className="mb-6">
            <TabsTrigger value="brand">Brand Identity</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="misc">Miscellaneous</TabsTrigger>
          </TabsList>

          <TabsContent value="brand">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Brand Identity</h2>
              
              <div className="space-y-6">
                <div>
                  <Label>Store Design</Label>
                  <Select value={selectedDesign} onValueChange={setSelectedDesign}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select design" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design1">Modern Grid</SelectItem>
                      <SelectItem value="design2">Classic List</SelectItem>
                      <SelectItem value="design3">Magazine Style</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Primary Color</Label>
                  <Input type="color" className="h-10" />
                </div>

                <div>
                  <Label>Secondary Color</Label>
                  <Input type="color" className="h-10" />
                </div>

                <Button 
                  onClick={() => saveConfig('brand')}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save Brand Settings"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Categories Management</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Gift Cards</Label>
                  <Switch 
                    checked={shopConfig.categories.giftCards}
                    onCheckedChange={(checked) => 
                      setShopConfig(prev => ({
                        ...prev,
                        categories: { ...prev.categories, giftCards: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Electronics</Label>
                  <Switch 
                    checked={shopConfig.categories.electronics}
                    onCheckedChange={(checked) => 
                      setShopConfig(prev => ({
                        ...prev,
                        categories: { ...prev.categories, electronics: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Experiences</Label>
                  <Switch 
                    checked={shopConfig.categories.experiences}
                    onCheckedChange={(checked) => 
                      setShopConfig(prev => ({
                        ...prev,
                        categories: { ...prev.categories, experiences: checked }
                      }))
                    }
                  />
                </div>

                <Button 
                  onClick={() => saveConfig('categories')}
                  disabled={saveConfigMutation.isPending}
                  className="mt-4"
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save Categories"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="misc">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Checkout Settings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Points Checkout</Label>
                    <p className="text-sm text-gray-500">Allow users to redeem with points</p>
                  </div>
                  <Switch 
                    checked={shopConfig.enablePointsCheckout}
                    onCheckedChange={(checked) => 
                      setShopConfig(prev => ({ ...prev, enablePointsCheckout: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Mixed Checkout</Label>
                    <p className="text-sm text-gray-500">Allow users to combine points and cash</p>
                  </div>
                  <Switch 
                    checked={shopConfig.enableMixedCheckout}
                    onCheckedChange={(checked) => 
                      setShopConfig(prev => ({ ...prev, enableMixedCheckout: checked }))
                    }
                  />
                </div>

                <Button 
                  onClick={() => saveConfig('misc')}
                  disabled={saveConfigMutation.isPending}
                  className="mt-4"
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save Checkout Settings"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ShopConfig;
