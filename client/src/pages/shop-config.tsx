
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState("design1");
  
  // Fetch current configuration
  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/shop/config"],
  });

  // Mutation for updating shop configuration
  const updateConfig = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/shop/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update configuration");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Shop configuration updated successfully",
      });
    },
  });

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

                <div>
                  <Label>Accent Color</Label>
                  <Input type="color" className="h-10" />
                </div>

                <Button onClick={() => updateConfig.mutate({ design: selectedDesign })}>
                  Save Brand Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Categories Management</h2>
              
              <div className="space-y-6">
                <div>
                  <Label>Active Categories</Label>
                  <div className="space-y-2 mt-2">
                    {["Electronics", "Gift Cards", "Experiences", "Fashion"].map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox id={category} />
                        <label htmlFor={category}>{category}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Excluded Brands</Label>
                  <Input placeholder="Add brands to exclude (comma-separated)" />
                </div>

                <div>
                  <Label>Company Branded Products</Label>
                  <Button variant="outline" className="mt-2">
                    Add New Product
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="misc">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Miscellaneous Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Cash + Points Checkout</Label>
                    <p className="text-sm text-gray-500">Allow users to combine cash and points for purchases</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ShopConfig;
