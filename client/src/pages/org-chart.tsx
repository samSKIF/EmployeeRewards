import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronUp, ChevronDown, Search, Users, Mail, Building, User, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface OrgUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  jobTitle: string;
  department: string;
  avatarUrl?: string;
  directReports: OrgUser[];
  manager?: OrgUser;
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
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);

  // Use current user as default focus
  const targetUserId = focusUserId || user?.id;

  const { data: orgData, isLoading, error } = useQuery<OrgChartData>({
    queryKey: ['/api/org-chart', targetUserId, direction],
    enabled: !!targetUserId,
  });

  const UserCard = ({ user, level = 0, isCenter = false, showExpandButtons = true }: { 
    user: OrgUser; 
    level?: number; 
    isCenter?: boolean;
    showExpandButtons?: boolean;
  }) => {
    const isExpanded = expandedNodes.has(user.id);
    const hasDirectReports = user.directReports && user.directReports.length > 0;
    const hasManager = !!user.manager;

    const handleUserClick = () => {
      setSelectedEmployee(user);
      setShowEmployeeDetails(true);
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
      setFocusUserId(user.id);
      setDirection(expandDirection);
    };

    return (
      <div className="relative">
        {/* Up Arrow */}
        {showExpandButtons && hasManager && (
          <div className="flex justify-center mb-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              onClick={(e) => toggleExpansion(e, 'up')}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* User Card */}
        <Card 
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            isCenter ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={handleUserClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl || undefined} />
                <AvatarFallback>
                  {user.name.charAt(0)}{user.surname?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {user.name} {user.surname}
                </h3>
                <p className="text-xs text-gray-600 truncate">{user.jobTitle}</p>
                <Badge variant="secondary" className="text-xs mt-1">
                  {user.department}
                </Badge>
              </div>
            </div>
            
            {/* Team size indicator */}
            {hasDirectReports && (
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <Users className="h-3 w-3 mr-1" />
                {user.directReports.length} team member{user.directReports.length !== 1 ? 's' : ''}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Down Arrow */}
        {showExpandButtons && hasDirectReports && (
          <div className="flex justify-center mt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              onClick={(e) => toggleExpansion(e, 'down')}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Employee Details Dialog Component
  const EmployeeDetailsDialog = () => {
    if (!selectedEmployee) return null;

    const handleFocusOnEmployee = (employee: OrgUser) => {
      setFocusUserId(employee.id);
      setDirection('center');
      setShowEmployeeDetails(false);
    };

    return (
      <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedEmployee.avatarUrl} />
                <AvatarFallback>
                  {selectedEmployee.name.charAt(0)}{selectedEmployee.surname?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">
                  {selectedEmployee.name} {selectedEmployee.surname}
                </h2>
                <p className="text-gray-600">{selectedEmployee.jobTitle}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Employee Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
            {selectedEmployee.manager && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowUp className="h-5 w-5" />
                    <span>Reports To</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleFocusOnEmployee(selectedEmployee.manager!)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedEmployee.manager.avatarUrl} />
                      <AvatarFallback>
                        {selectedEmployee.manager.name.charAt(0)}{selectedEmployee.manager.surname?.charAt(0) || ''}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedEmployee.manager.name} {selectedEmployee.manager.surname}
                      </p>
                      <p className="text-sm text-gray-600">{selectedEmployee.manager.jobTitle}</p>
                      <p className="text-xs text-gray-500">{selectedEmployee.manager.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Direct Reports */}
            {selectedEmployee.directReports && selectedEmployee.directReports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowDown className="h-5 w-5" />
                    <span>Direct Reports</span>
                    <Badge variant="secondary">{selectedEmployee.directReports.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedEmployee.directReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
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
                          <p className="text-xs text-gray-500">{report.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Direct Reports Message */}
            {(!selectedEmployee.directReports || selectedEmployee.directReports.length === 0) && (
              <Card>
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
        </DialogContent>
      </Dialog>
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
              {orgData.upHierarchy.reverse().map((manager, index) => (
                <div key={manager.id} className="w-64">
                  <UserCard user={manager} level={index} />
                  {index < orgData.upHierarchy.length - 1 && (
                    <div className="h-4 w-px bg-gray-300 mx-auto"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current User (Center) */}
        <div className="text-center">
          <div className="w-64 mx-auto">
            <UserCard user={orgData.centerUser} isCenter={true} />
          </div>
        </div>

        {/* Peers (Same Level) */}
        {orgData.peers.length > 0 && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Team Members</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {orgData.peers.map((peer) => (
                <UserCard key={peer.id} user={peer} showExpandButtons={false} />
              ))}
            </div>
          </div>
        )}

        {/* Direct Reports (Below) */}
        {orgData.downHierarchy.length > 0 && (
          <div className="text-center">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Direct Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {orgData.downHierarchy.map((report) => (
                <UserCard key={report.id} user={report} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 text-center">
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => {
              setFocusUserId(user?.id || null);
              setDirection('center');
            }}
          >
            Back to My Position
          </Button>
        </div>
      </div>

      {/* Employee Details Dialog */}
      <EmployeeDetailsDialog />
    </div>
  );
};

export default OrgChart;