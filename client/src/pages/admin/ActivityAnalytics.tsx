import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, BarChart3, Users, Clock, TrendingUp, Calendar, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ActivityData {
  total_activities: number;
  unique_users: number;
  action_types: Record<string, number>;
  resource_types: Record<string, number>;
  hourly_distribution: Record<number, number>;
  average_response_time: number;
  most_active_users: Record<string, number>;
  period: string;
  date_range: {
    start: string;
    end: string;
  };
}

interface UserActivity {
  id: number;
  user_id: number;
  action_type: string;
  resource_type?: string;
  resource_id?: number;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  performance_metrics?: any;
  created_at: string;
}

interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  table_name?: string;
  record_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function ActivityAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [activeTab, setActiveTab] = useState('analytics');

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<ActivityData>({
    queryKey: ['admin-analytics', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest(`/api/admin/analytics?period=${selectedPeriod}`);
      return response;
    },
  });

  // Fetch recent activities
  const { data: activities, isLoading: activitiesLoading } = useQuery<{
    activities: UserActivity[];
    pagination: any;
  }>({
    queryKey: ['admin-activities'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/activities?limit=20');
      return response;
    },
  });

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: auditLoading } = useQuery<{
    audit_logs: AuditLog[];
    pagination: any;
  }>({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/audit-logs?limit=20');
      return response;
    },
  });

  const formatActionType = (actionType: string) => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getActionTypeColor = (actionType: string) => {
    if (actionType.includes('create')) return 'bg-green-100 text-green-800';
    if (actionType.includes('update')) return 'bg-blue-100 text-blue-800';
    if (actionType.includes('delete')) return 'bg-red-100 text-red-800';
    if (actionType.includes('login')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor user behavior and system performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('analytics')}
          className="rounded-md"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>
        <Button
          variant={activeTab === 'activities' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('activities')}
          className="rounded-md"
        >
          <Activity className="w-4 h-4 mr-2" />
          Activities
        </Button>
        <Button
          variant={activeTab === 'audit' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('audit')}
          className="rounded-md"
        >
          <Filter className="w-4 h-4 mr-2" />
          Audit Logs
        </Button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Activities</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.total_activities.toLocaleString()}</p>
                      </div>
                      <Activity className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.unique_users}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.average_response_time}ms</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Period</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.period}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Types Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Action Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.action_types)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 10)
                        .map(([action, count]) => (
                          <div key={action} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge className={getActionTypeColor(action)}>
                                {formatActionType(action)}
                              </Badge>
                            </div>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Most Active Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.most_active_users)
                        .slice(0, 8)
                        .map(([userId, count]) => (
                          <div key={userId} className="flex items-center justify-between">
                            <span className="text-sm font-medium">User {userId}</span>
                            <Badge variant="outline">{count} actions</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>
      )}

      {activeTab === 'activities' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent User Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : activities?.activities ? (
              <div className="space-y-3">
                {activities.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <Badge className={getActionTypeColor(activity.action_type)}>
                        {formatActionType(activity.action_type)}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">User {activity.user_id}</p>
                        {activity.resource_type && (
                          <p className="text-xs text-gray-500">
                            {activity.resource_type} {activity.resource_id && `#${activity.resource_id}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatTimeAgo(activity.created_at)}</p>
                      {activity.performance_metrics?.response_time_ms && (
                        <p className="text-xs text-gray-500">
                          {activity.performance_metrics.response_time_ms}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No activities found</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Recent Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : auditLogs?.audit_logs ? (
              <div className="space-y-3">
                {auditLogs.audit_logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center space-x-4">
                      <Badge className={getActionTypeColor(log.action)}>
                        {formatActionType(log.action)}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {log.table_name} {log.record_id && `#${log.record_id}`}
                        </p>
                        {log.user_id && (
                          <p className="text-xs text-gray-500">by User {log.user_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatTimeAgo(log.created_at)}</p>
                      {log.ip_address && (
                        <p className="text-xs text-gray-500">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No audit logs found</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}