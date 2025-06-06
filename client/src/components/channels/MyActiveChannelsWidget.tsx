import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Users, ArrowRight, Building, MapPin, Heart, Briefcase, Coffee } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface Channel {
  id: number;
  name: string;
  channelType: string;
  memberCount: number;
  unreadCount?: number;
  lastActivity?: string;
}

const getChannelIcon = (type: string) => {
  switch (type) {
    case 'department': return <Building className="h-4 w-4" />;
    case 'site': return <MapPin className="h-4 w-4" />;
    case 'interest': return <Heart className="h-4 w-4" />;
    case 'project': return <Briefcase className="h-4 w-4" />;
    case 'social': return <Coffee className="h-4 w-4" />;
    default: return <MessageCircle className="h-4 w-4" />;
  }
};

export function MyActiveChannelsWidget() {
  const { data: myChannels = [], isLoading } = useQuery({
    queryKey: ['/api/channels/my-channels'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Active Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeChannels = (myChannels as Channel[]).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">My Active Channels</CardTitle>
          <Link href="/channels">
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        <CardDescription>
          Quick access to your most active channels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeChannels.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-3">You haven't joined any channels yet</p>
            <Link href="/channels">
              <Button size="sm" variant="outline">
                Discover Channels
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {activeChannels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getChannelIcon(channel.channelType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {channel.name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center text-xs text-gray-500">
                        <Users className="h-3 w-3 mr-1" />
                        {channel.memberCount}
                      </div>
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {channel.channelType}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {myChannels.length > 6 && (
              <div className="pt-2 border-t">
                <Link href="/channels">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View {myChannels.length - 6} more channels
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}