import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const designs = [
    {
      id: "design1",
      name: "Grid Layout",
      image: "/shop-designs/grid-layout.png",
      description: "Modern grid-based layout with large product cards"
    },
    {
      id: "design2",
      name: "List View",
      image: "/shop-designs/list-view.png", 
      description: "Classic list view with detailed product information"
    },
    {
      id: "design3",
      name: "Magazine Style",
      image: "/shop-designs/magazine.png",
      description: "Magazine-style layout with featured products"
    }
  ];

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const firebaseToken = localStorage.getItem('firebaseToken');
      const response = await fetch("/api/shop/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${firebaseToken}`
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
        description: "Shop design updated successfully"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update shop design",
        variant: "destructive"
      });
    }
  });

  const handleSaveDesign = () => {
    if (!selectedDesign) {
      toast({
        title: "Error",
        description: "Please select a design first",
        variant: "destructive"
      });
      return;
    }

    saveConfigMutation.mutate({ design: selectedDesign });
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Shop Configuration</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {designs.map((design) => (
            <Card 
              key={design.id}
              className={`cursor-pointer transition-all ${
                selectedDesign === design.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDesign(design.id)}
            >
              <CardContent className="p-4">
                <img 
                  src={design.image} 
                  alt={design.name}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
                <h3 className="font-semibold mb-2">{design.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{design.description}</p>
                <div className="flex items-center justify-center">
                  <div 
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedDesign === design.id 
                        ? 'border-blue-500 bg-blue-500' 
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          className="mt-6"
          onClick={handleSaveDesign}
          disabled={!selectedDesign || saveConfigMutation.isPending}
        >
          {saveConfigMutation.isPending ? "Applying design..." : "Apply Selected Design"}
        </Button>
      </div>
    </MainLayout>
  );
};

export default ShopConfig;