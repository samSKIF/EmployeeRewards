import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Search, ChevronDown, Mail, Phone, MapPin, Calendar, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OrgUser {
  id: number;
  name: string;
  surname?: string;
  email: string;
  jobTitle: string;
  department: string;
  avatarUrl?: string;
  manager?: OrgUser | null;
  directReports?: OrgUser[];
}

interface OrgChartData {
  centerUser: OrgUser;
  upHierarchy: OrgUser[];
  downHierarchy: OrgUser[];
  peers: OrgUser[];
}

const OrgChart: React.FC = () => {
  const { user } = useAuth();
  const [targetUserId, setTargetUserId] = useState<number | null>(user?.id || null);
  const [direction] = useState<'up' | 'down' | 'center'>('center');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgUser | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'details'>('chart');

  const { data: orgData, isLoading, error } = useQuery<OrgChartData>({
    queryKey: ['/api/org-chart', targetUserId, direction],
    enabled: !!targetUserId,
  });

  const MindMapNode = ({ user, level = 0, isRoot = false }: { user: OrgUser; level?: number; isRoot?: boolean }) => {
    const isCurrentUser = user.id === targetUserId;
    const isExpanded = expandedNodes.has(user.id);
    const hasDirectReports = user.directReports && user.directReports.length > 0;

    const handleUserClick = () => {
      setSelectedEmployee(user);
      setViewMode('details');
    };

    const toggleExpansion = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedNodes);
      if (isExpanded) {
        newExpanded.delete(user.id);
      } else {
        newExpanded.add(user.id);
      }
      setExpandedNodes(newExpanded);
    };

    const filteredDirectReports = user.directReports?.filter(report =>
      searchTerm === '' || 
      `${report.name} ${report.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const shouldShow = searchTerm === '' || 
      `${user.name} ${user.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      filteredDirectReports.length > 0;

    if (!shouldShow) return null;

    const nodeSize = isRoot ? 'w-72 h-24' : level === 0 ? 'w-64 h-20' : 'w-56 h-16';
    const avatarSize = isRoot ? 'h-14 w-14' : level === 0 ? 'h-12 w-12' : 'h-10 w-10';
    const textSize = isRoot ? 'text-lg' : level === 0 ? 'text-base' : 'text-sm';

    return (
      <div className="relative">
        {!isRoot && level > 0 && (
          <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-300 transform -translate-x-0.5" />
        )}
        
        <div className="flex flex-col items-center">
          <Card 
            className={`${nodeSize} cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${
              isCurrentUser ? 'ring-3 ring-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg' : 
              isRoot ? 'bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg' :
              'hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100'
            } ${level === 0 ? 'border-2 border-gray-300' : 'border border-gray-200'}`}
            onClick={handleUserClick}
          >
            <CardContent className="p-3 h-full flex items-center">
              <div className="flex items-center space-x-3 w-full">
                <Avatar className={`${avatarSize} ring-2 ring-white shadow-md`}>
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback className={`${isRoot ? 'text-lg font-bold' : 'font-semibold'} bg-gradient-to-br from-blue-400 to-purple-400 text-white`}>
                    {user.name.charAt(0)}{user.surname?.charAt(0) || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-gray-900 truncate ${textSize}`}>
                    {user.name} {user.surname}
                  </p>
                  <p className={`text-gray-600 truncate ${isRoot ? 'text-sm' : 'text-xs'}`}>
                    {user.jobTitle}
                  </p>
                  {!isRoot && (
                    <p className="text-xs text-gray-400 truncate">{user.department}</p>
                  )}
                </div>
                {hasDirectReports && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleExpansion}
                    className={`${isRoot ? 'h-8 w-8' : 'h-6 w-6'} p-0 rounded-full hover:bg-blue-100`}
                  >
                    <ChevronDown className={`${isRoot ? 'h-5 w-5' : 'h-4 w-4'} transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {isExpanded && hasDirectReports && (
            <div className="relative mt-8">
              <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-gray-300 transform -translate-x-0.5" />
              
              <div className={`grid gap-8 ${filteredDirectReports.length === 1 ? 'grid-cols-1' : 
                filteredDirectReports.length === 2 ? 'grid-cols-2' : 
                filteredDirectReports.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {filteredDirectReports.map((report, index) => (
                  <div key={report.id} className="relative">
                    <div className="absolute -top-8 left-1/2 w-0.5 h-4 bg-gray-300 transform -translate-x-0.5" />
                    {filteredDirectReports.length > 1 && (
                      <div className={`absolute -top-4 bg-gray-300 h-0.5 ${
                        index === 0 ? 'left-1/2 w-1/2' :
                        index === filteredDirectReports.length - 1 ? 'right-1/2 w-1/2' :
                        'left-0 w-full'
                      }`} />
                    )}
                    <MindMapNode user={report} level={level + 1} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EmployeeDetailsView = () => {
    if (!selectedEmployee) return null;

    const handleFocusOnEmployee = (employee: OrgUser) => {
      setTargetUserId(employee.id);
      setSelectedEmployee(null);
      setViewMode('chart');
    };

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setViewMode('chart')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Org Chart
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Employee Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedEmployee.avatarUrl} />
                    <AvatarFallback className="text-lg bg-gradient-to-br from-blue-400 to-purple-400 text-white">
                      {selectedEmployee.name.charAt(0)}{selectedEmployee.surname?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedEmployee.name} {selectedEmployee.surname}
                    </h2>
                    <p className="text-lg text-gray-600 mb-2">{selectedEmployee.jobTitle}</p>
                    <Badge variant="secondary" className="mb-4">{selectedEmployee.department}</Badge>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span>{selectedEmployee.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4" />
                        <span>{selectedEmployee.department}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {selectedEmployee.manager && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Reports to</h3>
                  <div 
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFocusOnEmployee(selectedEmployee.manager!)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedEmployee.manager.avatarUrl} />
                      <AvatarFallback>
                        {selectedEmployee.manager.name.charAt(0)}{selectedEmployee.manager.surname?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {selectedEmployee.manager.name} {selectedEmployee.manager.surname}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{selectedEmployee.manager.jobTitle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedEmployee.directReports && selectedEmployee.directReports.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Direct Reports ({selectedEmployee.directReports.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedEmployee.directReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleFocusOnEmployee(report)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={report.avatarUrl} />
                          <AvatarFallback className="text-xs">
                            {report.name.charAt(0)}{report.surname?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {report.name} {report.surname}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{report.jobTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  };

  const OrgChartView = () => {
    if (!orgData) return null;
    
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organizational Mindmap</h1>
          <p className="text-gray-600">
            Explore your organization's structure in a visual mindmap. Click nodes to expand teams and view employee details.
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex justify-center overflow-x-auto">
          <div className="inline-block min-w-max">
            <MindMapNode 
              user={orgData.centerUser} 
              level={0} 
              isRoot={true} 
            />
          </div>
        </div>

        <div className="flex justify-center space-x-4 mt-8">
          <Button
            variant="outline"
            onClick={() => {
              setTargetUserId(user?.id || null);
            }}
          >
            Back to My Position
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !orgData) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Failed to load organizational chart. Please try again.
        </div>
      </div>
    );
  }

  return viewMode === 'details' ? <EmployeeDetailsView /> : <OrgChartView />;
};

export default OrgChart;