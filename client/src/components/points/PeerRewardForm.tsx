import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Award, Gift, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Badge types with descriptions and colors
const badgeTypes = [
  { id: "teamwork", name: "Teamwork", color: "bg-blue-500", description: "Exceptional collaboration and team spirit" },
  { id: "innovation", name: "Innovation", color: "bg-purple-500", description: "Creative ideas and solutions" },
  { id: "excellence", name: "Excellence", color: "bg-emerald-500", description: "Outstanding quality of work" },
  { id: "helpfulness", name: "Helpful", color: "bg-amber-500", description: "Going above and beyond to help others" },
  { id: "leadership", name: "Leadership", color: "bg-red-500", description: "Taking initiative and leading by example" }
];

export type PeerRewardProps = {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
};

const PeerRewardForm = ({ onSuccess, onCancel, className = "" }: PeerRewardProps) => {
  const [recipientId, setRecipientId] = useState<string>("");
  const [points, setPoints] = useState<number>(50);
  const [badgeType, setBadgeType] = useState<string>("teamwork");
  const [message, setMessage] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user's balance
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/points/balance"],
  });

  // Fetch all employees for the recipient dropdown
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/employees"],
  });

  // Update user balance when data is available
  useEffect(() => {
    if (balanceData?.balance !== undefined) {
      setUserBalance(balanceData.balance);
    }
  }, [balanceData]);

  // Mutation for sending peer reward
  const peerRewardMutation = useMutation({
    mutationFn: async () => {
      if (!recipientId || !points || !badgeType || !message) {
        throw new Error("Please fill in all required fields");
      }

      if (points <= 0) {
        throw new Error("Points must be greater than zero");
      }

      if (points > userBalance) {
        throw new Error(`You don't have enough points. Your balance: ${userBalance}`);
      }

      const response = await apiRequest("POST", "/api/points/peer-reward", {
        recipientId: parseInt(recipientId),
        amount: points,
        reason: badgeType,
        message
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reward sent successfully!",
        description: "Your recognition and points have been sent.",
      });

      // Reset form
      setRecipientId("");
      setPoints(50);
      setBadgeType("teamwork");
      setMessage("");

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/points/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error sending reward",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    peerRewardMutation.mutate();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-semibold">Recognize & Reward a Colleague</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient</Label>
          <Select value={recipientId} onValueChange={setRecipientId}>
            <SelectTrigger id="recipient">
              <SelectValue placeholder="Select a colleague" />
            </SelectTrigger>
            <SelectContent>
              {users && users.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name} {user.surname || ""} {user.department ? `(${user.department})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Recognition Badge</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {badgeTypes.map((badge) => (
              <div
                key={badge.id}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  badgeType === badge.id 
                    ? 'border-2 border-amber-400 bg-amber-50' 
                    : 'border-gray-200 hover:border-amber-200'
                }`}
                onClick={() => setBadgeType(badge.id)}
              >
                <div className="flex items-center gap-2">
                  <Badge className={`${badge.color} hover:${badge.color}`}>
                    {badge.name}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="points">Points to Award</Label>
          <div className="flex items-center gap-2">
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => setPoints(Math.max(0, points - 10))}
              disabled={points <= 10}
            >
              -
            </Button>
            <div className="relative flex items-center">
              <Input
                id="points"
                type="number"
                min="10"
                max={userBalance}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="pl-7"
              />
              <Gift className="h-4 w-4 absolute left-2 text-amber-500" />
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => setPoints(points + 10)}
              disabled={points >= userBalance}
            >
              +
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Your balance: {userBalance} points
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Write a note about why you're recognizing this person..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            className="bg-amber-600 hover:bg-amber-700 text-white"
            disabled={peerRewardMutation.isPending || !recipientId || !message}
          >
            {peerRewardMutation.isPending ? "Sending..." : "Send Recognition & Points"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PeerRewardForm;