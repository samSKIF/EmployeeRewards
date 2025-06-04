import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Plus, 
  Globe,
  Lock,
  MoreHorizontal,
  Settings,
  Bell,
  ChevronRight,
  MessageCircle,
  Heart,
  Share2,
  Clock,
  Image as ImageIcon,
  Video,
  Calendar,
  MapPin,
  UserPlus,
  Star
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

// Facebook-style Group Card Component
function FacebookGroupCard({ group, isJoined, onJoin }: any) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Group Cover Image */}
      <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
        <div className="absolute bottom-3 left-3">
          <h3 className="text-white font-bold text-lg">{group.name}</h3>
        </div>
        <div className="absolute top-3 right-3">
          {group.isPrivate ? (
            <Lock className="h-4 w-4 text-white/80" />
          ) : (
            <Globe className="h-4 w-4 text-white/80" />
          )}
        </div>
      </div>
      
      {/* Group Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">
            {group.memberCount} members • {group.postsToday || 0} posts today
          </div>
          <MoreHorizontal className="h-4 w-4 text-gray-400 cursor-pointer" />
        </div>
        
        <p className="text-gray-700 text-sm mb-4 line-clamp-2">
          {group.description || "Connect with colleagues who share similar interests and engage in meaningful discussions."}
        </p>
        
        {/* Recent Activity */}
        <div className="flex items-center mb-4">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <Avatar key={i} className="h-6 w-6 border-2 border-white">
                <AvatarFallback className="text-xs bg-gray-300">U{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-2">Recent activity</span>
        </div>
        
        {/* Join Button */}
        <Button 
          onClick={() => onJoin(group.id)}
          disabled={isJoined}
          className={`w-full ${
            isJoined 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isJoined ? (
            <>
              <Star className="h-4 w-4 mr-2" />
              Joined
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Join Group
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Discover Tab Component
function DiscoverTab({ groups, onJoin, userGroups, searchQuery }: any) {
  const filteredGroups = groups?.filter((group: any) => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Suggested Groups */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Suggested for you</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.slice(0, 6).map((group: any) => (
            <FacebookGroupCard
              key={group.id}
              group={group}
              isJoined={userGroups?.some((ug: any) => ug.id === group.id)}
              onJoin={onJoin}
            />
          ))}
        </div>
      </div>

      {/* Popular Groups */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Popular in your workplace</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.slice(6, 12).map((group: any) => (
            <FacebookGroupCard
              key={group.id}
              group={group}
              isJoined={userGroups?.some((ug: any) => ug.id === group.id)}
              onJoin={onJoin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Your Groups Tab Component
function YourGroupsTab({ userGroups }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Your groups</h2>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </div>
        
        {userGroups && userGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userGroups.map((group: any) => (
              <div key={group.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-sm text-gray-500">{group.memberCount} members</p>
                  </div>
                  <MoreHorizontal className="h-5 w-5 text-gray-400" />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Active 2h ago
                  </span>
                  <span className="flex items-center">
                    <Bell className="h-4 w-4 mr-1" />
                    3 new posts
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">You haven't joined any groups yet</h3>
            <p className="text-gray-500 mb-6">Discover groups that match your interests</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Feed Tab Component
function FeedTab() {
  return (
    <div className="space-y-6">
      {/* Create Post */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Input 
              placeholder="Share something with your groups..."
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ImageIcon className="h-4 w-4 mr-2" />
              Photo
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Video className="h-4 w-4 mr-2" />
              Video
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              Event
            </Button>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">Post</Button>
        </div>
      </div>

      {/* Sample Posts */}
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>U{i}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">User {i}</p>
                <p className="text-sm text-gray-500">Posted in Tech Enthusiasts • 2h ago</p>
              </div>
            </div>
            <MoreHorizontal className="h-5 w-5 text-gray-400 cursor-pointer" />
          </div>
          
          <p className="text-gray-700 mb-4">
            Just discovered this amazing new technology! What do you all think about the latest developments in AI?
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Heart className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <MessageCircle className="h-4 w-4 mr-2" />
              Comment
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Create Group Form Component
function CreateGroupForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isPrivate: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter group name"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe your group"
          rows={3}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <Input
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Technology, Sports, Arts"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="private"
          checked={formData.isPrivate}
          onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="private" className="text-sm text-gray-700">Make this group private</label>
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Create Group</Button>
      </div>
    </form>
  );
}

// Main Groups Page Component - Facebook Style
export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('discover');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!user
  });

  // Fetch user's groups
  const { data: userGroups } = useQuery({
    queryKey: ['/api/groups/user', user?.id],
    enabled: !!user?.id
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: { name: string; description: string; category: string; isPrivate: boolean }) => {
      return apiRequest('/api/groups', {
        method: 'POST',
        body: JSON.stringify(groupData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      setShowCreateDialog(false);
    }
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest(`/api/groups/${groupId}/join`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/groups/user', user?.id] });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Facebook-style Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
              <p className="text-gray-600 text-sm">Connect with colleagues who share your interests</p>
            </div>
            
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Facebook Style */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search groups"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="p-2">
                <div 
                  className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTab === 'discover' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTab('discover')}
                >
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Search className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Discover</span>
                </div>

                <div 
                  className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTab === 'your-groups' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTab('your-groups')}
                >
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium">Your groups</span>
                    <div className="text-xs text-gray-500">{userGroups?.length || 0} groups</div>
                  </div>
                </div>

                <div 
                  className={`flex items-center px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTab === 'feed' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTab('feed')}
                >
                  <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <MessageCircle className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="font-medium">Feed</span>
                </div>
              </div>

              {/* Your Groups Quick Access */}
              {userGroups && userGroups.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 mb-3">Your groups</h3>
                  <div className="space-y-2">
                    {userGroups.slice(0, 5).map((group: any) => (
                      <div key={group.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white font-bold text-sm">
                            {group.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.memberCount} members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedTab === 'discover' && <DiscoverTab groups={groups} onJoin={joinGroupMutation.mutate} userGroups={userGroups} searchQuery={searchQuery} />}
            {selectedTab === 'your-groups' && <YourGroupsTab userGroups={userGroups} />}
            {selectedTab === 'feed' && <FeedTab />}
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Group</DialogTitle>
          </DialogHeader>
          <CreateGroupForm onSubmit={(data) => createGroupMutation.mutate(data)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}