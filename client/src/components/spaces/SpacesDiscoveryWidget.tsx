import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, TrendingUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface Channel {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  channelType: string;
  isActive: boolean;
}

export function ChannelsDiscoveryWidget() {
  const { data: trendingChannels } = useQuery({
    queryKey: ['/api/channels/trending'],
  });

  const { data: suggestedChannels } = useQuery({
    queryKey: ['/api/channels/suggestions'],
  });

  return (
    <div className="space-y-4">
      {/* Trending Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingChannels?.slice(0, 3).map((channel: Channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <Link href={`/groups/${channel.id}`}>
                  <p className="text-sm font-medium truncate hover:text-blue-600 cursor-pointer">
                    {channel.name}
                  </p>
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{channel.memberCount}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {channel.channelType}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
          {(!trendingChannels || trendingChannels.length === 0) && (
            <p className="text-sm text-gray-500">No trending channels yet</p>
          )}
        </CardContent>
      </Card>

      {/* Suggested Channels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Suggested for You
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestedChannels?.slice(0, 3).map((channel: Channel) => (
            <div key={channel.id} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <Link href={`/groups/${channel.id}`}>
                  <p className="text-sm font-medium truncate hover:text-blue-600 cursor-pointer">
                    {channel.name}
                  </p>
                </Link>
                <p className="text-xs text-gray-500 truncate">{channel.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{channel.memberCount}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {channel.channelType}
                  </Badge>
                </div>
              </div>
              <Button size="sm" variant="outline" className="ml-2">
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {(!suggestedChannels || suggestedChannels.length === 0) && (
            <p className="text-sm text-gray-500">No suggestions available</p>
          )}
        </CardContent>
      </Card>

      {/* Discover More */}
      <Card>
        <CardContent className="pt-6">
          <Link href="/channels">
            <Button className="w-full" variant="outline">
              Discover More Channels
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}