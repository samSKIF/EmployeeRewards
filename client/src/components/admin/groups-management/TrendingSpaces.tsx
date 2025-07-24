import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Users, MessageCircle, Activity, Eye } from 'lucide-react';

interface TrendingSpace {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  messageCount: number;
  recentActivity: string;
  category: string;
  isPrivate: boolean;
  trending: boolean;
  growthRate: number;
}

export function TrendingSpaces() {
  // Fetch trending spaces data
  const { data: trendingSpaces = [], isLoading } = useQuery({
    queryKey: ['/api/admin/spaces/trending'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Mock data for demonstration (replace with real API data)
  const mockTrendingSpaces: TrendingSpace[] = [
    {
      id: 1,
      name: 'Product Development Hub',
      description: 'Collaborative space for product team discussions and planning',
      memberCount: 24,
      messageCount: 156,
      recentActivity: '2 hours ago',
      category: 'Product',
      isPrivate: false,
      trending: true,
      growthRate: 15.2,
    },
    {
      id: 2,
      name: 'Engineering Team',
      description: 'Technical discussions and code reviews',
      memberCount: 18,
      messageCount: 89,
      recentActivity: '1 hour ago',
      category: 'Engineering',
      isPrivate: false,
      trending: true,
      growthRate: 12.8,
    },
    {
      id: 3,
      name: 'Design Critique',
      description: 'Share designs and get feedback from the team',
      memberCount: 12,
      messageCount: 67,
      recentActivity: '30 minutes ago',
      category: 'Design',
      isPrivate: false,
      trending: true,
      growthRate: 8.5,
    },
  ];

  const displaySpaces = trendingSpaces.length > 0 ? trendingSpaces : mockTrendingSpaces;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Spaces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Trending Spaces
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Updated 5 min ago
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {displaySpaces.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No trending activity yet</p>
          </div>
        ) : (
          displaySpaces.map((space, index) => (
            <div
              key={space.id}
              className="flex items-center gap-4 p-3 rounded-lg border bg-gradient-to-r from-white to-gray-50 hover:shadow-sm transition-shadow"
            >
              {/* Trending Rank */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                {index + 1}
              </div>

              {/* Space Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {space.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {space.category}
                  </Badge>
                  {space.trending && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Hot
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-2">
                  {space.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {space.memberCount} members
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {space.messageCount} messages
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    {space.recentActivity}
                  </div>
                </div>
              </div>

              {/* Growth Indicator */}
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +{space.growthRate}%
                </div>
                <p className="text-xs text-gray-500">growth</p>
              </div>

              {/* Action Button */}
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                View
              </Button>
            </div>
          ))
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-gray-500">
            Showing top {displaySpaces.length} trending spaces
          </p>
          <Button variant="ghost" size="sm" className="text-xs">
            View All Spaces
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}