import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GroupCard } from "./GroupCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, Plus, Loader2 } from "lucide-react";

interface GroupsListProps {
  onCreateGroup?: () => void;
  onJoinGroup?: (groupId: number) => void;
  onViewGroup?: (groupId: number) => void;
}

export function GroupsList({ onCreateGroup, onJoinGroup, onViewGroup }: GroupsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");

  // Fetch groups
  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['/api/groups'],
  });

  // Filter groups based on search and filters
  const filteredGroups = groups?.filter((group: any) => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || group.groupType === typeFilter;
    const matchesAccess = accessFilter === "all" || group.accessLevel === accessFilter;
    
    return matchesSearch && matchesType && matchesAccess;
  }) || [];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Failed to load groups. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
          <p className="text-gray-600">Discover and join groups in your organization</p>
        </div>
        {onCreateGroup && (
          <Button onClick={onCreateGroup} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Find Groups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="interest">Interest</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="site">Site/Location</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="company">Company-wide</SelectItem>
              </SelectContent>
            </Select>
            <Select value={accessFilter} onValueChange={setAccessFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Access</SelectItem>
                <SelectItem value="open">Open to all</SelectItem>
                <SelectItem value="department_only">Department only</SelectItem>
                <SelectItem value="site_only">Site only</SelectItem>
                <SelectItem value="invite_only">Invite only</SelectItem>
                <SelectItem value="approval_required">Approval required</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Active filters */}
          {(searchTerm || typeFilter !== "all" || accessFilter !== "all") && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <button onClick={() => setSearchTerm("")} className="ml-1 hover:bg-gray-300 rounded">×</button>
                </Badge>
              )}
              {typeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter("all")} className="ml-1 hover:bg-gray-300 rounded">×</button>
                </Badge>
              )}
              {accessFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  Access: {accessFilter}
                  <button onClick={() => setAccessFilter("all")} className="ml-1 hover:bg-gray-300 rounded">×</button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("all");
                  setAccessFilter("all");
                }}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {groups?.length === 0 ? "No groups yet" : "No groups match your filters"}
            </h3>
            <p className="text-gray-500 mb-4">
              {groups?.length === 0 
                ? "Be the first to create a group in your organization"
                : "Try adjusting your search criteria"
              }
            </p>
            {groups?.length === 0 && onCreateGroup && (
              <Button onClick={onCreateGroup}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group: any) => (
            <GroupCard
              key={group.id}
              group={group}
              onJoin={onJoinGroup}
              onView={onViewGroup}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {filteredGroups.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredGroups.length} of {groups?.length || 0} groups
        </div>
      )}
    </div>
  );
}