import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChannelFormData {
  name: string;
  description: string;
  channelType: string;
  accessLevel: string;
  allowedDepartments: string[];
  allowedSites: string[];
  allowedRoles: string[];
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ChannelFormData>({
    name: "",
    description: "",
    channelType: "company",
    accessLevel: "open",
    allowedDepartments: [],
    allowedSites: [],
    allowedRoles: []
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: ChannelFormData) => {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error("Failed to create channel");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Channel created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        channelType: "company",
        accessLevel: "open",
        allowedDepartments: [],
        allowedSites: [],
        allowedRoles: []
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name is required",
        variant: "destructive"
      });
      return;
    }
    createChannelMutation.mutate(formData);
  };

  const channelTypes = [
    { value: "company", label: "Company-wide" },
    { value: "department", label: "Department" },
    { value: "site", label: "Site/Location" },
    { value: "project", label: "Project/Team" },
    { value: "interest", label: "Interest-based" }
  ];

  const accessLevels = [
    { value: "open", label: "Open to all" },
    { value: "department_only", label: "Department only" },
    { value: "site_only", label: "Site only" },
    { value: "invite_only", label: "Invite only" },
    { value: "approval_required", label: "Approval required" }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a new communication channel for your organization.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter channel name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="channelType">Channel Type</Label>
              <Select
                value={formData.channelType}
                onValueChange={(value) => setFormData({ ...formData, channelType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {channelTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter channel description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessLevel">Access Level</Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                {accessLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createChannelMutation.isPending}
            >
              {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}