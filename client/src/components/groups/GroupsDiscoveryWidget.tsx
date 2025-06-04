import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, ArrowRight, MessageCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface GroupsDiscoveryWidgetProps {
  variant?: 'sidebar' | 'dashboard' | 'profile';
  className?: string;
}

export function GroupsDiscoveryWidget({ variant = 'sidebar', className = '' }: GroupsDiscoveryWidgetProps) {
  // Fetch trending groups
  const { data: trendingGroups } = useQuery({
    queryKey: ['/api/groups/trending'],
    enabled: true
  });

  // Fetch user's suggested groups
  const { data: suggestedGroups } = useQuery({
    queryKey: ['/api/groups/suggestions'],
    enabled: true
  });

  const handleViewAllGroups = () => {
    window.location.href = '/groups';
  };

  const handleJoinGroup = (groupName: string) => {
    window.location.href = `/groups?join=${encodeURIComponent(groupName)}`;
  };

  if (variant === 'sidebar') {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-600" />
            Discover Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Trending Groups */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
              <TrendingUp className="h-3 w-3" />
              Trending
            </div>
            {trendingGroups?.slice(0, 3).map((group: any) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => handleJoinGroup(group.name)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{group.name}</p>
                  <p className="text-xs text-gray-500">{group.memberCount} members</p>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8"
              onClick={handleViewAllGroups}
            >
              <Users className="h-3 w-3 mr-1" />
              View All Groups
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'dashboard') {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-600" />
            Groups Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Groups Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">12</p>
              <p className="text-xs text-gray-600">Your Groups</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">38</p>
              <p className="text-xs text-gray-600">New Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">156</p>
              <p className="text-xs text-gray-600">Active Groups</p>
            </div>
          </div>

          {/* Suggested Groups */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Suggested for You</h4>
            {suggestedGroups?.slice(0, 3).map((group: any) => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h5 className="text-sm font-medium">{group.name}</h5>
                  <p className="text-xs text-gray-500 mt-1">{group.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {group.category}
                    </Badge>
                    <span className="text-xs text-gray-500">{group.memberCount} members</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleJoinGroup(group.name)}
                >
                  Join
                </Button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleViewAllGroups}
            >
              <Users className="h-4 w-4 mr-2" />
              Browse All Groups
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-teal-600 hover:bg-teal-700"
              onClick={() => window.location.href = '/groups?create=true'}
            >
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Profile variant
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">My Groups</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* User's Groups */}
        <div className="space-y-2">
          {trendingGroups?.slice(0, 4).map((group: any) => (
            <div
              key={group.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleJoinGroup(group.name)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{group.name}</p>
                <p className="text-xs text-gray-500">{group.memberCount} members</p>
              </div>
              <MessageCircle className="h-4 w-4 text-gray-400" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleViewAllGroups}
          >
            <Users className="h-4 w-4 mr-2" />
            Explore More Groups
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}