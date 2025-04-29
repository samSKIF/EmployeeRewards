import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/types";
import { 
  X, 
  Star, 
  Users, 
  Zap, 
  Sparkles, 
  Target, 
  Cake, 
  Trophy, 
  Medal
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface RecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | undefined;
}

export const RecognitionModal = ({ isOpen, onClose, currentUser }: RecognitionModalProps) => {
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState<number>(50);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Reset form when modal is opened/closed
  React.useEffect(() => {
    if (isOpen) {
      setSelectedBadge("");
      setRecipientId(null);
      setMessage("");
      setPoints(50);
    }
  }, [isOpen]);
  
  // Get users for recognition recipient selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    enabled: isOpen,
  });
  
  // Create recognition mutation
  const createRecognitionMutation = useMutation({
    mutationFn: async ({ recipientId, badgeType, message, points }: { 
      recipientId: number; 
      badgeType: string; 
      message: string;
      points: number;
    }) => {
      const content = `Congratulations @${users.find(u => u.id === recipientId)?.name?.split(' ')[0] || 'teammate'} for ${message}`;
      
      // Get Firebase token from localStorage
      const token = localStorage.getItem('firebaseToken');
      
      // Create request with token
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          type: "recognition",
          recognition: {
            recipientId,
            badgeType,
            message,
            points
          }
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create recognition");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/posts"] });
      onClose();
      toast({
        title: "Recognition sent!",
        description: "Your recognition has been successfully posted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send recognition",
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientId) {
      toast({
        title: "Error",
        description: "Please select a teammate to recognize",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBadge) {
      toast({
        title: "Error",
        description: "Please select a badge type",
        variant: "destructive"
      });
      return;
    }
    
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recognition message",
        variant: "destructive"
      });
      return;
    }
    
    createRecognitionMutation.mutate({
      recipientId,
      badgeType: selectedBadge,
      message,
      points
    });
  };
  
  // Available badge options
  const badges = [
    { type: "Outstanding Work", icon: <Star className="h-5 w-5" />, color: "bg-amber-500" },
    { type: "Team Player", icon: <Users className="h-5 w-5" />, color: "bg-blue-500" },
    { type: "Problem Solver", icon: <Zap className="h-5 w-5" />, color: "bg-purple-500" },
    { type: "Innovation Award", icon: <Sparkles className="h-5 w-5" />, color: "bg-emerald-500" },
    { type: "Leadership", icon: <Target className="h-5 w-5" />, color: "bg-red-500" },
    { type: "Work Anniversary", icon: <Cake className="h-5 w-5" />, color: "bg-pink-500" },
    { type: "Top Performer", icon: <Trophy className="h-5 w-5" />, color: "bg-indigo-500" },
    { type: "Milestone", icon: <Medal className="h-5 w-5" />, color: "bg-cyan-500" },
  ];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recognize a Teammate</h2>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Teammate</label>
              <Select value={recipientId?.toString()} onValueChange={(value) => setRecipientId(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a teammate" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.id !== currentUser?.id).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Badge Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Badge</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {badges.map((badge) => (
                  <div 
                    key={badge.type}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedBadge === badge.type 
                        ? `border-${badge.color.split('-')[1]}-500 bg-${badge.color.split('-')[1]}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedBadge(badge.type)}
                  >
                    <div className={`${badge.color} text-white p-2 rounded-full mb-2`}>
                      {badge.icon}
                    </div>
                    <span className="text-xs text-center font-medium">{badge.type}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-2">Recognition Message</label>
              <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What are you recognizing them for?"
                className="w-full resize-none"
                rows={3}
              />
            </div>
            
            {/* Points */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Points <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <div className="flex items-center gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setPoints(Math.max(0, points - 50))}
                  disabled={points <= 0}
                >
                  -
                </Button>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 font-bold text-sm min-w-[100px] text-center">
                  {points} Points
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setPoints(points + 50)}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">These points will be awarded to the recipient</p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-green-600 text-white hover:bg-green-700"
                disabled={createRecognitionMutation.isPending}
              >
                {createRecognitionMutation.isPending ? "Sending..." : "Send Recognition"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RecognitionModal;