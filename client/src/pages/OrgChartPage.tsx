import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GitBranch,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Maximize2,
  Minimize2,
  User,
  Building,
  Network,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: number;
  name: string;
  surname: string;
  email: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
  children?: Employee[];
}

interface UserHierarchy {
  user: Employee;
  manager: Employee | null;
  skipManager: Employee | null;
  directReports: Employee[];
  indirectReports: Employee[];
  peers: Employee[];
}

const OrgChartPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'focused'>('focused');

  // Fetch organization hierarchy
  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery<{
    success: boolean;
    data: Employee[];
    total: number;
  }>({
    queryKey: ['/api/users/org-chart/hierarchy'],
    enabled: viewMode === 'hierarchy',
  });

  // Fetch user relationships
  const { data: relationshipsData, isLoading: relationshipsLoading } = useQuery<{
    success: boolean;
    data: UserHierarchy;
  }>({
    queryKey: [`/api/users/org-chart/relationships/${selectedUserId || ''}`],
    enabled: viewMode === 'focused',
  });

  // Fetch reporting tree for selected user
  const { data: reportingTreeData, isLoading: treeLoading } = useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: [`/api/users/org-chart/reporting-tree/${selectedUserId || ''}`],
    enabled: viewMode === 'hierarchy' && selectedUserId !== null,
  });

  useEffect(() => {
    if (currentUser) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser]);

  const toggleNodeExpansion = (nodeId: number) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    if (viewMode === 'focused') {
      // Refetch relationships for new user
      setExpandedNodes(new Set());
    }
  };

  const EmployeeCard = ({ employee, isSelected = false, onClick, size = 'md' }: {
    employee: Employee;
    isSelected?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const sizeClasses = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4',
    };

    const avatarSizes = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
    };

    return (
      <div
        className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${sizeClasses[size]} ${
          isSelected ? 'ring-2 ring-teal-500' : ''
        }`}
        onClick={onClick}
      >
        <div className="flex items-center space-x-3">
          <Avatar className={avatarSizes[size]}>
            <AvatarImage src={employee.avatarUrl} alt={`${employee.name} ${employee.surname}`} />
            <AvatarFallback>
              {employee.name[0]}{employee.surname?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`font-medium text-gray-900 truncate ${size === 'sm' ? 'text-sm' : ''}`}>
              {employee.name} {employee.surname}
            </p>
            {employee.jobTitle && (
              <p className={`text-gray-500 truncate ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {employee.jobTitle}
              </p>
            )}
            {employee.department && size !== 'sm' && (
              <Badge variant="outline" className="mt-1 text-xs">
                {employee.department}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  const HierarchyNode = ({ node, level = 0 }: { node: Employee; level?: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div className="relative">
        <div className="flex flex-col items-center">
          <EmployeeCard
            employee={node}
            isSelected={selectedUserId === node.id}
            onClick={() => handleUserSelect(node.id)}
            size={level === 0 ? 'lg' : level === 1 ? 'md' : 'sm'}
          />
          
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {node.children?.length} {node.children?.length === 1 ? 'Report' : 'Reports'}
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-4 ml-8 pl-4 border-l-2 border-gray-200">
            <div className="space-y-4">
              {node.children?.map((child) => (
                <HierarchyNode key={child.id} node={child} level={level + 1} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const FocusedView = ({ hierarchy }: { hierarchy: UserHierarchy }) => {
    return (
      <div className="space-y-8">
        {/* N+2: Skip-level Manager */}
        {hierarchy.skipManager && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Skip-level Manager (N+2)</p>
            <div className="flex justify-center">
              <EmployeeCard
                employee={hierarchy.skipManager}
                onClick={() => handleUserSelect(hierarchy.skipManager!.id)}
              />
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-0.5 h-8 bg-gray-300"></div>
            </div>
          </div>
        )}

        {/* N+1: Direct Manager */}
        {hierarchy.manager && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Direct Manager (N+1)</p>
            <div className="flex justify-center">
              <EmployeeCard
                employee={hierarchy.manager}
                onClick={() => handleUserSelect(hierarchy.manager!.id)}
                size="lg"
              />
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-0.5 h-8 bg-gray-300"></div>
            </div>
          </div>
        )}

        {/* Current User and Peers */}
        <div>
          <p className="text-sm text-gray-500 mb-2 text-center">
            Current Position & Peers
          </p>
          <div className="flex items-center justify-center space-x-4">
            {/* Peers on the left */}
            <div className="flex space-x-2">
              {hierarchy.peers.slice(0, 2).map((peer) => (
                <EmployeeCard
                  key={peer.id}
                  employee={peer}
                  onClick={() => handleUserSelect(peer.id)}
                  size="sm"
                />
              ))}
            </div>

            {/* Current User */}
            <div className="ring-4 ring-teal-500 rounded-lg">
              <EmployeeCard
                employee={hierarchy.user}
                isSelected={true}
                size="lg"
              />
            </div>

            {/* Peers on the right */}
            <div className="flex space-x-2">
              {hierarchy.peers.slice(2, 4).map((peer) => (
                <EmployeeCard
                  key={peer.id}
                  employee={peer}
                  onClick={() => handleUserSelect(peer.id)}
                  size="sm"
                />
              ))}
            </div>
          </div>
          
          {hierarchy.peers.length > 4 && (
            <p className="text-center text-sm text-gray-500 mt-2">
              +{hierarchy.peers.length - 4} more peers
            </p>
          )}
        </div>

        {/* N-1: Direct Reports */}
        {hierarchy.directReports.length > 0 && (
          <div>
            <div className="flex justify-center mb-2">
              <div className="w-0.5 h-8 bg-gray-300"></div>
            </div>
            <p className="text-sm text-gray-500 mb-2 text-center">
              Direct Reports (N-1) - {hierarchy.directReports.length} total
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {hierarchy.directReports.map((report) => (
                <EmployeeCard
                  key={report.id}
                  employee={report}
                  onClick={() => handleUserSelect(report.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* N-2: Indirect Reports */}
        {hierarchy.indirectReports.length > 0 && (
          <div>
            <div className="flex justify-center mb-2">
              <div className="w-0.5 h-8 bg-gray-300"></div>
            </div>
            <p className="text-sm text-gray-500 mb-2 text-center">
              Indirect Reports (N-2) - {hierarchy.indirectReports.length} total
            </p>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {hierarchy.indirectReports.slice(0, 10).map((report) => (
                <EmployeeCard
                  key={report.id}
                  employee={report}
                  onClick={() => handleUserSelect(report.id)}
                  size="sm"
                />
              ))}
            </div>
            {hierarchy.indirectReports.length > 10 && (
              <p className="text-center text-sm text-gray-500 mt-2">
                +{hierarchy.indirectReports.length - 10} more indirect reports
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const isLoading = hierarchyLoading || relationshipsLoading || treeLoading;

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organization Chart</h1>
            <p className="text-gray-600 mt-1">
              Visualize reporting relationships and organizational structure
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'focused' ? 'default' : 'outline'}
              onClick={() => setViewMode('focused')}
            >
              <Network className="h-4 w-4 mr-2" />
              Focused View
            </Button>
            <Button
              variant={viewMode === 'hierarchy' ? 'default' : 'outline'}
              onClick={() => setViewMode('hierarchy')}
            >
              <GitBranch className="h-4 w-4 mr-2" />
              Hierarchy View
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search employees..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      <Card className="min-h-[600px]">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : (
            <>
              {viewMode === 'focused' && relationshipsData?.data && (
                <FocusedView hierarchy={relationshipsData.data} />
              )}

              {viewMode === 'hierarchy' && hierarchyData?.data && (
                <div className="space-y-6">
                  {hierarchyData.data.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No organizational hierarchy found</p>
                    </div>
                  ) : (
                    hierarchyData.data.map((rootNode: Employee) => (
                      <HierarchyNode key={rootNode.id} node={rootNode} />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-teal-500 rounded"></div>
              <span>Current Selection</span>
            </div>
            <div className="flex items-center space-x-2">
              <ChevronUp className="h-4 w-4" />
              <span>Manager (N+1, N+2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <ChevronDown className="h-4 w-4" />
              <span>Reports (N-1, N-2)</span>
            </div>
            <div className="flex items-center space-x-2">
              <ChevronLeft className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
              <span>Peers (Same Level)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgChartPage;