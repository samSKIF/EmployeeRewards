import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronUp, ChevronDown, Search, Users, Mail, Building, User, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
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

const OrgChart = () => {
  const { user } = useAuth();
  const [focusUserId, setFocusUserId] = useState<number | null>(null);
  const [direction, setDirection] = useState<'up' | 'down' | 'center'>('center');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<OrgUser | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'details'>('chart');

  // Use current user as default focus
  const targetUserId = focusUserId || user?.id;

  const { data: orgData, isLoading, error } = useQuery<OrgChartData>({
    queryKey: ['/api/org-chart', targetUserId, direction],
    enabled: !!targetUserId,
  });

  const UserCard = ({ user, level = 0 }: { user: OrgUser; level?: number }) => {
    const isCurrentUser = user.id === targetUserId;
    const isExpanded = expandedNodes.has(user.id);
    const hasDirectReports = user.directReports && user.directReports.length > 0;
    const hasManager = !!user.manager;

    const handleUserClick = () => {
      setSelectedEmployee(user);
      setViewMode('details');
    };

    const toggleExpansion = (e: React.MouseEvent, expandDirection: 'up' | 'down') => {
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

    return (
      <div className={`flex flex-col items-center space-y-2 ${level > 0 ? 'ml-8' : ''}`}>
        <Card 
          className={`w-80 cursor-pointer transition-all duration-200 hover:shadow-lg ${
            isCurrentUser ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
          }`}
          onClick={handleUserClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {user.name.charAt(0)}{user.surname?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {user.name} {user.surname}
                </p>
                <p className="text-sm text-gray-600 truncate">{user.jobTitle}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </CardContent>
          
          {/* Expansion controls */}
          {(hasManager || hasDirectReports) && (
            <div className="flex justify-center pb-2 space-x-2">
              {hasManager && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => toggleExpansion(e, 'up')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {hasDirectReports && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => toggleExpansion(e, 'down')}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Show expanded children */}
        {isExpanded && hasDirectReports && (
          <div className="flex flex-col space-y-4 pt-4">
            {filteredDirectReports.map((report) => (
              <UserCard key={report.id} user={report} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Employee Details View Component
  const EmployeeDetailsView = () => {
    if (!selectedEmployee) return null;

    const handleFocusOnEmployee = (employee: OrgUser) => {
      setSelectedEmployee(employee);
      setViewMode('details');
    };

    const backToChart = () => {
      setViewMode('chart');
      setSelectedEmployee(null);
    };

    return (
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={backToChart}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Org Chart
          </Button>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={selectedEmployee.avatarUrl} />
              <AvatarFallback className="text-lg">
                {selectedEmployee.name.charAt(0)}{selectedEmployee.surname?.charAt(0) || ''}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedEmployee.name} {selectedEmployee.surname}
              </h1>
              <p className="text-xl text-gray-600">{selectedEmployee.jobTitle}</p>
              <p className="text-gray-500">{selectedEmployee.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Employee Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm">{selectedEmployee.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Department:</span>
                <Badge variant="outline">{selectedEmployee.department}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Manager */}
          {selectedEmployee.manager ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUp className="h-5 w-5" />
                  <span>Reports To</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleFocusOnEmployee(selectedEmployee.manager!)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedEmployee.manager.avatarUrl} />
                    <AvatarFallback>
                      {selectedEmployee.manager.name.charAt(0)}{selectedEmployee.manager.surname?.charAt(0) || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">
                      {selectedEmployee.manager.name} {selectedEmployee.manager.surname}
                    </p>
                    <p className="text-gray-600">{selectedEmployee.manager.jobTitle}</p>
                    <p className="text-sm text-gray-500">{selectedEmployee.manager.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUp className="h-5 w-5" />
                  <span>Reports To</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-4">No manager assigned</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Direct Reports */}
        {selectedEmployee.directReports && selectedEmployee.directReports.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowDown className="h-5 w-5" />
                <span>Direct Reports</span>
                <Badge variant="secondary">{selectedEmployee.directReports.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedEmployee.directReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center space-x-3 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFocusOnEmployee(report)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={report.avatarUrl} />
                      <AvatarFallback>
                        {report.name.charAt(0)}{report.surname?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {report.name} {report.surname}
                      </p>
                      <p className="text-sm text-gray-600">{report.jobTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Direct Reports */}
        {(!selectedEmployee.directReports || selectedEmployee.directReports.length === 0) && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowDown className="h-5 w-5" />
                <span>Direct Reports</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-4">No direct reports</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Org Chart View Component  
  const OrgChartView = () => {
    if (!orgData) return null;
    
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Organizational Chart</h1>
          <p className="text-gray-600">
            Explore your organization's structure. Click on any person to see their manager and direct reports.
          </p>
        </div>

        {/* Search */}
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

        {/* Organizational Chart */}
        <div className="space-y-8">
          {/* Management Chain (Above) */}
          {orgData.upHierarchy.length > 0 && (
            <div className="text-center">
              <h3 className="text-lg font-medium mb-4 text-gray-700">Management Chain</h3>
            <div className="flex flex-col items-center space-y-4">
              {orgData.upHierarchy.map((manager) => (
                <UserCard key={manager.id} user={manager} />
              ))}
            </div>
          </div>
        )}

        {/* Center User */}
        <div className="text-center">
          <h3 className="text-lg font-medium mb-4 text-gray-700 flex items-center justify-center space-x-2">
            <Users className="h-5 w-5" />
            <span>
              {orgData.centerUser.id === user?.id ? 'You' : 'Focused View'}
            </span>
          </h3>
          <UserCard user={orgData.centerUser} />
        </div>

        {/* Peers */}
        {orgData.peers.length > 0 && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
              {orgData.peers.map((peer) => (
                <UserCard key={peer.id} user={peer} />
              ))}
            </div>
          </div>
        )}

        {/* Direct Reports */}
        {orgData.downHierarchy.length > 0 && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Direct Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
              {orgData.downHierarchy.map((report) => (
                <UserCard key={report.id} user={report} />
              ))}
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {
              setFocusUserId(null);
              setDirection('center');
            }}
          >
            Back to My Position
          </Button>
        </div>
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

  // Render based on view mode
  return viewMode === 'details' ? <EmployeeDetailsView /> : <OrgChartView />;
};

export default OrgChart;