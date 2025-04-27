
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const designs = [
    {
      id: "design1",
      name: "Grid Layout",
      image: "/shop-designs/grid-layout.jpg",
      description: "Modern grid-based layout with large product cards"
    },
    {
      id: "design2",
      name: "List View",
      image: "/shop-designs/list-view.jpg", 
      description: "Classic list view with detailed product information"
    },
    {
      id: "design3",
      name: "Magazine Style",
      image: "/shop-designs/magazine.jpg",
      description: "Magazine-style layout with featured products"
    }
  ];

  // Get current design
  const { data: currentConfig } = useQuery({
    queryKey: ["/api/shop/config"],
    onSuccess: (data) => {
      if (data?.design) {
        setSelectedDesign(data.design);
      }
    }
  });

  const { data: currentConfig } = useQuery({
    queryKey: ['/api/shop/config'],
    onSuccess: (data) => {
      if (data?.design) {
        setSelectedDesign(data.design);
      }
    }
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { design: string }) => {
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
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Shop Configuration</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {designs.map((design) => (
            <Card 
              key={design.id}
              className={`cursor-pointer transition-all ${
                selectedDesign === design.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDesign(design.id)}
            >
              <CardContent className="p-4">
                <div className="relative aspect-video mb-4">
                  <img 
                    src={design.image} 
                    alt={design.name}
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                      e.currentTarget.className = "w-full h-full object-contain p-8 bg-gray-100 rounded-md";
                    }}
                  />
                </div>
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
