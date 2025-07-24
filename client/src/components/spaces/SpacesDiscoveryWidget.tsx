import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, TrendingUp, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

interface Space {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  channelType: string;
  isActive: boolean;
}

export function SpacesDiscoveryWidget() {
  const {
    data: trendingSpaces = [],
    isLoading: trendingLoading,
    error: trendingError,
  } = useQuery<Space[]>({
    queryKey: ['/api/channels/trending'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const {
    data: suggestedSpaces = [],
    isLoading: suggestedLoading,
    error: suggestedError,
  } = useQuery<Space[]>({
    queryKey: ['/api/channels/suggestions'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return (
    <div className="space-y-4">
      {/* Trending Spaces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending Spaces
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center space-between animate-pulse"
                >
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : trendingError ? (
            <p className="text-sm text-red-500">
              Failed to load trending spaces
            </p>
          ) : trendingSpaces?.length > 0 ? (
            trendingSpaces.slice(0, 3).map((space: Space) => (
              <div key={space.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/spaces/${space.id}`}>
                    <p className="text-sm font-medium truncate hover:text-blue-600 cursor-pointer">
                      {space.name}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {space.memberCount}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {space.channelType}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No trending spaces yet</p>
          )}
        </CardContent>
      </Card>

      {/* Suggested Spaces */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggested for You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestedLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between animate-pulse"
                >
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded ml-2"></div>
                </div>
              ))}
            </div>
          ) : suggestedError ? (
            <p className="text-sm text-red-500">
              Failed to load suggested spaces
            </p>
          ) : suggestedSpaces?.length > 0 ? (
            suggestedSpaces.slice(0, 3).map((space: Space) => (
              <div key={space.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <Link href={`/spaces/${space.id}`}>
                    <p className="text-sm font-medium truncate hover:text-blue-600 cursor-pointer">
                      {space.name}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-500 truncate">
                    {space.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {space.memberCount}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {space.channelType}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="ml-2">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No suggestions available</p>
          )}
        </CardContent>
      </Card>

      {/* Discover More */}
      <Card>
        <CardContent className="pt-6">
          <Link href="/spaces">
            <Button className="w-full" variant="outline">
              Discover More Spaces
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
