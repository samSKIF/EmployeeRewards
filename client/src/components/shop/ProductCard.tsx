import { useState } from "react";
import { Product } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Gift, Award, Tag, Ticket, ShoppingBag } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    description: string;
    category?: string;
    points: number;
    imageUrl?: string;
    isActive?: boolean | null;
    supplier?: string;
    createdAt?: Date;
    createdBy?: number | null;
    isAvailable: boolean;
  };
  balance: number;
}

const ProductCard = ({ product, balance }: ProductCardProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  const { branding } = useBranding();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const redeemMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      
      const response = await apiRequest("POST", "/api/points/redeem", {
        amount: product.points,
        productId: product.id,
        description: `Redemption of ${product.name}`
      });
      
      const data = await response.json();
      setExternalRef(data.order.externalRef || null);
      return data;
    },
    onSuccess: () => {
      // Update balance and transactions data
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      setRedemptionSuccess(true);
      setIsProcessing(false);
      
      toast({
        title: "Success!",
        description: "Product redeemed successfully.",
      });
    },
    onError: (error: any) => {
      setIsProcessing(false);
      
      toast({
        variant: "destructive",
        title: "Redemption failed",
        description: error.message || "There was an error redeeming this product.",
      });
      
      setShowConfirmDialog(false);
    }
  });

  const handleRedeem = () => {
    setShowConfirmDialog(true);
  };

  const confirmRedeem = () => {
    redeemMutation.mutate();
  };

  const closeDialog = () => {
    setShowConfirmDialog(false);
    setRedemptionSuccess(false);
    setExternalRef(null);
  };

  const isGiftCard = product.category?.toLowerCase() === "gift cards" || 
                      product.category?.toLowerCase().includes("gift");
  
  const isPremium = product.points >= 500;
  const isLuxury = product.points > 1000;
  const isExperience = product.category?.toLowerCase() === "experiences" || 
                        product.category?.toLowerCase().includes("experience");

  // Determine category icon
  const getCategoryIcon = () => {
    if (isGiftCard) return <Gift className="h-4 w-4 mr-1" />;
    if (isExperience) return <Ticket className="h-4 w-4 mr-1" />;
    if (isLuxury) return <Award className="h-4 w-4 mr-1" />;
    return <Tag className="h-4 w-4 mr-1" />;
  };

  // Badge styles based on point value and availability
  const getBadgeVariant = () => {
    if (!product.isAvailable) return "destructive";
    if (isLuxury) return "default";
    if (isPremium) return "default";
    return "secondary";
  };

  // Badge component with custom styling
  const PointsBadge = () => (
    <div 
      className={`text-white font-semibold px-3 py-1.5 rounded-full text-sm flex items-center shadow-sm ${
        !product.isAvailable ? 'bg-red-500' :
        isLuxury ? 'bg-gradient-to-r from-amber-500 to-yellow-500' :
        isPremium ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
        'bg-gradient-to-r from-emerald-500 to-green-500'
      }`}
      style={
        product.isAvailable && !isLuxury && !isPremium ? 
        { background: `linear-gradient(to right, ${branding?.primaryColor || "#4F46E5"}, ${branding?.secondaryColor || "#10B981"})` } : 
        {}
      }
    >
      <CreditCard className="h-3.5 w-3.5 mr-1" />
      {product.points} points
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
        {/* Category badge */}
        <div className="absolute top-3 left-3 z-10">
          <Badge variant={getBadgeVariant()} className="text-xs px-2 py-0.5 capitalize">
            {getCategoryIcon()}
            {product.category}
          </Badge>
        </div>

        {/* Points status */}
        {!product.isAvailable && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {product.points - balance} more points needed
            </Badge>
          </div>
        )}

        {/* Premium badge */}
        {isLuxury && (
          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
            <div className="absolute transform rotate-45 bg-amber-500 text-white text-xs font-bold py-1 right-[-35px] top-[9px] w-[120px] text-center">
              PREMIUM
            </div>
          </div>
        )}

        {/* Image with hover effect */}
        <div className="relative overflow-hidden h-48">
          <img
            src={product.imageUrl || "https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8Z2lmdHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60"}
            alt={product.name}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Overlay gradient for better text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Quick action button on hover */}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button 
              size="sm" 
              onClick={handleRedeem} 
              disabled={!product.isAvailable}
              className="shadow-md"
              style={
                product.isAvailable ? 
                { background: branding?.primaryColor || "#4F46E5" } : 
                {}
              }
            >
              Quick Redeem
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-semibold text-gray-800 group-hover:text-gray-900 mb-2">{product.name}</h3>
          <p className="text-sm text-gray-600 flex-grow">{product.description}</p>
          
          <div className="mt-4 flex justify-between items-center">
            <PointsBadge />
            <Button
              onClick={handleRedeem}
              disabled={!product.isAvailable}
              size="sm"
              className={`
                ${!product.isAvailable ? "opacity-50 cursor-not-allowed bg-gray-400" : ""}
              `}
              style={
                product.isAvailable ? 
                { background: branding?.primaryColor || "#4F46E5" } : 
                {}
              }
            >
              {!product.isAvailable ? "Not Available" : "Redeem"}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          {!redemptionSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Redemption</DialogTitle>
                <DialogDescription>
                  Are you sure you want to redeem {product.name} for {product.points} points?
                </DialogDescription>
              </DialogHeader>
              
              <div className="my-6">
                <div className="flex items-center mb-4">
                  <img 
                    src={product.imageUrl || "https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8Z2lmdHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60"} 
                    alt={product.name} 
                    className="w-16 h-16 object-cover rounded mr-4" 
                  />
                  <div>
                    <h4 className="font-semibold text-gray-800">{product.name}</h4>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Your current balance:</span>
                    <span className="font-semibold text-gray-800">{balance} points</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cost:</span>
                    <span className="font-semibold text-gray-800">-{product.points} points</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-medium text-gray-800">Remaining balance:</span>
                    <span className="font-semibold text-gray-800">{balance - product.points} points</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button 
                  onClick={confirmRedeem} 
                  disabled={isProcessing}
                  style={{ background: branding?.primaryColor || "#4F46E5" }}
                >
                  {isProcessing ? "Processing..." : "Confirm Redemption"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-green-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <DialogTitle className="text-center">Redemption Successful!</DialogTitle>
                <DialogDescription className="text-center">
                  You have successfully redeemed {product.name}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="my-6 space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="mr-2">
                        {isGiftCard ? <Gift className="h-5 w-5 text-purple-500" /> : 
                        isExperience ? <Ticket className="h-5 w-5 text-blue-500" /> : 
                        <ShoppingBag className="h-5 w-5 text-indigo-500" />}
                      </div>
                      <span className="font-medium text-gray-800">Order Summary</span>
                    </div>
                    <Badge>{product.category}</Badge>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start mb-4">
                      <img src={product.imageUrl || "https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Nnx8Z2lmdHxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=800&q=60"} alt={product.name} className="w-16 h-16 object-cover rounded mr-3" />
                      <div>
                        <h4 className="font-medium text-gray-800">{product.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                      </div>
                    </div>
                    
                    {isGiftCard && externalRef && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Your gift card code:</p>
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono break-all border border-gray-200 select-all">
                          {externalRef}
                        </div>
                      </div>
                    )}
                    
                    {!isGiftCard && externalRef && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Your order reference:</p>
                        <div className="p-3 bg-gray-100 rounded-md text-sm font-mono border border-gray-200">
                          {externalRef}
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Previous balance:</span>
                        <span className="text-sm font-medium">{balance} points</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">Redemption cost:</span>
                        <span className="text-sm font-medium text-red-500">-{product.points} points</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t mt-2">
                        <span className="text-sm font-medium">Current balance:</span>
                        <span className="font-bold">{balance - product.points} points</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {isGiftCard && (
                  <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100">
                    <div className="font-medium mb-1">What's next?</div>
                    <p>You can use your gift card code at the retailer's website or in-store. Copy the code above and follow the redemption instructions provided by the retailer.</p>
                  </div>
                )}
                
                {isExperience && (
                  <div className="bg-green-50 text-green-800 p-3 rounded-md text-sm border border-green-100">
                    <div className="font-medium mb-1">What's next?</div>
                    <p>Details about your experience booking will be emailed to you. Save your order reference for future inquiries.</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={closeDialog}
                  style={{ background: branding?.primaryColor || "#4F46E5" }}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
