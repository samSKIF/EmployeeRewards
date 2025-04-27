
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const designs = [
    {
      id: "traditional",
      name: "Traditional Multi-Page Catalog",
      image: "/shop-designs/traditional.png",
      description: "Classic e-commerce layout with detailed navigation and filtering"
    },
    {
      id: "single-page",
      name: "Single-Page Long-Scroll",
      image: "/shop-designs/single-page.png",
      description: "Modern one-page design with smooth scrolling sections"
    },
    {
      id: "app-like",
      name: "App-Like Dashboard",
      image: "/shop-designs/app-like.png",
      description: "Power user interface with quick access to features"
    },
    {
      id: "guided",
      name: "Guided Discovery",
      image: "/shop-designs/guided.png",
      description: "Wizard-based interface for personalized recommendations"
    },
    {
      id: "modular",
      name: "Modular Headless",
      image: "/shop-designs/modular.png",
      description: "Flexible component-based layout system"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {designs.map((design) => (
            <Card 
              key={design.id}
              className={`cursor-pointer transition-all ${
                selectedDesign === design.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedDesign(design.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{design.name}</CardTitle>
                <CardDescription className="text-sm">{design.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video mb-4 overflow-hidden rounded-md">
                  <img 
                    src={design.image} 
                    alt={design.name}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-center">
                <div 
                  className={`w-4 h-4 rounded-full border-2 ${
                    selectedDesign === design.id 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300'
                  }`}
                />
              </CardFooter>
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
