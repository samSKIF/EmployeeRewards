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

interface ProductCardProps {
  product: Product & { available: boolean };
  balance: number;
}

const ProductCard = ({ product, balance }: ProductCardProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [externalRef, setExternalRef] = useState<string | null>(null);
  
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

  const isGiftCard = product.category === "Gift Cards";

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="font-semibold text-gray-800">{product.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
          <div className="mt-4 flex justify-between items-center">
            <span className="font-bold text-primary">{product.points} points</span>
            <Button
              onClick={handleRedeem}
              disabled={!product.available}
              className={!product.available ? "opacity-50 cursor-not-allowed" : ""}
            >
              Redeem
            </Button>
          </div>
          {!product.available && (
            <p className="text-xs text-red-500 mt-2">
              You need {product.points - balance} more points
            </p>
          )}
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
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Your current balance: <span className="font-semibold">{balance} points</span><br />
                  After redemption: <span className="font-semibold">{balance - product.points} points</span>
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button onClick={confirmRedeem} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Confirm Redemption"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Redemption Successful!</DialogTitle>
                <DialogDescription>
                  You have successfully redeemed {product.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="my-4">
                {isGiftCard && externalRef && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-2">Your gift card link:</p>
                    <div className="p-3 bg-gray-100 rounded text-sm break-all">
                      {externalRef}
                    </div>
                  </>
                )}
                
                {!isGiftCard && externalRef && (
                  <>
                    <p className="text-sm font-medium text-gray-700 mb-2">Your order reference:</p>
                    <div className="p-3 bg-gray-100 rounded text-sm">
                      {externalRef}
                    </div>
                  </>
                )}
                
                <p className="text-sm text-gray-500 mt-4">
                  Your new balance: <span className="font-semibold">{balance - product.points} points</span>
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductCard;
