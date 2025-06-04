import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Lock, Globe, Shield, UserCheck, Clock } from "lucide-react";

interface GroupCardProps {
  group: {
    id: number;
    name: string;
    description: string;
    memberCount: number;
    accessLevel: string;
    isPrivate: boolean;
    groupType: string;
    coverImage?: string;
    recentMembers?: Array<{
      id: number;
      name: string;
      avatar?: string;
    }>;
  };
  onJoin?: (groupId: number) => void;
  onView?: (groupId: number) => void;
  isLoading?: boolean;
}

export function GroupCard({ group, onJoin, onView, isLoading }: GroupCardProps) {
  const getAccessIcon = () => {
    switch (group.accessLevel) {
      case 'open':
        return <Globe className="w-4 h-4" />;
      case 'department_only':
      case 'site_only':
        return <Shield className="w-4 h-4" />;
      case 'invite_only':
        return <Lock className="w-4 h-4" />;
      case 'approval_required':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getAccessLabel = () => {
    switch (group.accessLevel) {
      case 'open':
        return 'Open to all';
      case 'department_only':
        return 'Department only';
      case 'site_only':
        return 'Site only';
      case 'invite_only':
        return 'Invite only';
      case 'approval_required':
        return 'Approval required';
      default:
        return 'Unknown';
    }
  };

  const getGroupTypeColor = () => {
    switch (group.groupType) {
      case 'interest':
        return 'bg-purple-100 text-purple-800';
      case 'department':
        return 'bg-blue-100 text-blue-800';
      case 'site':
        return 'bg-green-100 text-green-800';
      case 'project':
        return 'bg-orange-100 text-orange-800';
      case 'company':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {group.coverImage && (
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative">
          <img 
            src={group.coverImage} 
            alt={group.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">{group.name}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={getGroupTypeColor()}>
                {group.groupType}
              </Badge>
              {group.isPrivate && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Private
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {group.description || "No description available."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Member Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span>{group.memberCount} member{group.memberCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              {getAccessIcon()}
              <span className="text-xs">{getAccessLabel()}</span>
            </div>
          </div>

          {/* Recent Members */}
          {group.recentMembers && group.recentMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Recent:</span>
              <div className="flex -space-x-1">
                {group.recentMembers.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="w-6 h-6 border-2 border-white">
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-xs">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {group.recentMembers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs text-gray-600">+{group.recentMembers.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onView?.(group.id)}
              className="flex-1"
            >
              View
            </Button>
            <Button 
              size="sm" 
              onClick={() => onJoin?.(group.id)}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {group.accessLevel === 'approval_required' ? 'Request' : 'Join'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}