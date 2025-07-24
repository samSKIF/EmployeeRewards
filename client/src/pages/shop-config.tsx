import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';

const ShopConfig = () => {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const designs = [
    {
      id: 'traditional',
      name: 'Traditional Multi-Page Catalog',
      image: '/shop-designs/traditional.png',
      description:
        'Full catalog with mega-menu navigation, filtered browsing and detailed product pages',
      features: [
        'Mega-menu categories',
        'Product filtering',
        'Image galleries',
        'Detailed product pages',
      ],
    },
    {
      id: 'single-page',
      name: 'Single-Page Long-Scroll Shop',
      image: '/shop-designs/single-page.png',
      description: 'All content on one scrollable page with quick navigation',
      features: [
        'Quick-redeem widget',
        'Dynamic carousels',
        'Promotional sections',
        'Story blocks',
      ],
    },
    {
      id: 'app-like',
      name: 'App-Like Dashboard Portal',
      image: '/shop-designs/app-like.png',
      description: 'Power user interface focused on quick redemptions',
      features: [
        'Points widget',
        'Quick redemptions',
        'Tabbed browsing',
        'Saved lists',
      ],
    },
    {
      id: 'guided',
      name: 'Guided Discovery',
      image: '/shop-designs/guided.png',
      description: 'Wizard-style interface to find perfect rewards',
      features: [
        'Multi-step wizard',
        'Tailored results',
        'Quick checkout',
        'Smart filters',
      ],
    },
    {
      id: 'modular',
      name: 'Modular Components',
      image: '/shop-designs/modular.png',
      description: 'Flexible layout built from customizable blocks',
      features: [
        'Drag-drop blocks',
        'Custom layouts',
        'Dynamic content',
        'Responsive design',
      ],
    },
  ];

  // Get current design
  const { data: currentConfig } = useQuery({
    queryKey: ['/api/shop/config'],
    onSuccess: (data) => {
      if (data?.design) {
        setSelectedDesign(data.design);
      }
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { design: string }) => {
      const firebaseToken = localStorage.getItem('firebaseToken');
      const response = await fetch('/api/shop/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Shop design updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update shop design',
        variant: 'destructive',
      });
    },
  });

  const handleSaveDesign = () => {
    if (!selectedDesign) {
      toast({
        title: 'Error',
        description: 'Please select a design first',
        variant: 'destructive',
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
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg">{design.name}</CardTitle>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      selectedDesign === design.id
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                <CardDescription className="text-sm">
                  {design.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video mb-4 overflow-hidden rounded-md">
                  <img
                    src={design.image}
                    alt={design.name}
                    className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Key Features:
                  </h4>
                  <ul className="grid grid-cols-2 gap-2">
                    {design.features.map((feature, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 flex items-center"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className={selectedDesign === design.id ? 'bg-blue-50' : ''}
                >
                  {selectedDesign === design.id ? 'Selected' : 'Select Design'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleSaveDesign}
          disabled={!selectedDesign || saveConfigMutation.isPending}
          className="mt-4"
        >
          {saveConfigMutation.isPending
            ? 'Applying design...'
            : 'Apply Selected Design'}
        </Button>
      </div>
    </MainLayout>
  );
};

export default ShopConfig;
