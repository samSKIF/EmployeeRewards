import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { DashboardStats, Recognition, TopPerformer } from './types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowUpRight,
  Users,
  CreditCard,
  ShoppingBag,
  Activity,
} from 'lucide-react';

const AdminDashboard = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    staleTime: 60000, // 1 minute
  });

  // Sample data for charts - in a real app, this would come from the API
  const pointsOverTimeData = [
    { name: 'Jan', points: 4000 },
    { name: 'Feb', points: 3000 },
    { name: 'Mar', points: 5000 },
    { name: 'Apr', points: 2780 },
    { name: 'May', points: 1890 },
    { name: 'Jun', points: 2390 },
    { name: 'Jul', points: 3490 },
  ];

  const engagementData = [
    { name: 'Posts', count: stats?.posts || 0 },
    { name: 'Comments', count: stats?.comments || 0 },
    { name: 'Reactions', count: stats?.reactions || 0 },
    { name: 'Recognitions', count: stats?.recognitions || 0 },
  ];

  const rewardsData = [
    { name: 'Electronics', value: 35 },
    { name: 'Gift Cards', value: 45 },
    { name: 'Experiences', value: 15 },
    { name: 'Wellness', value: 5 },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Admin Dashboard
        </h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-green-500 flex items-center text-sm font-medium">
                  +12% <ArrowUpRight className="h-4 w-4 ml-1" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Total Employees</p>
                <h3 className="text-2xl font-bold">
                  {stats?.userCount || 0}
                  {stats?.subscribedUsers && (
                    <span className="text-sm font-normal text-gray-500">
                      {' '}
                      / {stats.subscribedUsers}
                    </span>
                  )}
                </h3>
                {stats?.userCount &&
                  stats?.subscribedUsers &&
                  stats.userCount > stats.subscribedUsers && (
                    <p className="text-xs text-red-500 mt-1">
                      Exceeds subscription limit
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="bg-purple-100 p-3 rounded-full">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-green-500 flex items-center text-sm font-medium">
                  +18% <ArrowUpRight className="h-4 w-4 ml-1" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Points Balance</p>
                <h3 className="text-2xl font-bold">
                  {stats?.pointsBalance?.toLocaleString() || 0}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="bg-amber-100 p-3 rounded-full">
                  <ShoppingBag className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-green-500 flex items-center text-sm font-medium">
                  +24% <ArrowUpRight className="h-4 w-4 ml-1" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Orders</p>
                <h3 className="text-2xl font-bold">{stats?.orderCount || 0}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="bg-teal-100 p-3 rounded-full">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <span className="text-green-500 flex items-center text-sm font-medium">
                  +42% <ArrowUpRight className="h-4 w-4 ml-1" />
                </span>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">Engagement</p>
                <h3 className="text-2xl font-bold">
                  {(stats?.posts || 0) + (stats?.comments || 0)}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="points" className="mb-8">
          <TabsList className="w-full max-w-md mb-4">
            <TabsTrigger value="points" className="flex-1">
              Points Analytics
            </TabsTrigger>
            <TabsTrigger value="engagement" className="flex-1">
              Engagement
            </TabsTrigger>
            <TabsTrigger value="rewards" className="flex-1">
              Rewards
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="points"
            className="bg-white p-6 rounded-lg shadow"
          >
            <CardHeader className="px-0 pt-0">
              <CardTitle>Points Distribution Over Time</CardTitle>
              <CardDescription>
                Points earned and spent through the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={pointsOverTimeData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="points"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent
            value="engagement"
            className="bg-white p-6 rounded-lg shadow"
          >
            <CardHeader className="px-0 pt-0">
              <CardTitle>Platform Engagement</CardTitle>
              <CardDescription>
                Social interactions by category.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={engagementData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#4ade80" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent
            value="rewards"
            className="bg-white p-6 rounded-lg shadow"
          >
            <CardHeader className="px-0 pt-0">
              <CardTitle>Rewards Redemption</CardTitle>
              <CardDescription>Distribution by category.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rewardsData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>

        {/* Additional Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Recognitions</CardTitle>
              <CardDescription>Latest peer recognitions.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 animate-pulse"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {!stats?.recentRecognitions ||
                  stats.recentRecognitions?.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No recent recognitions
                    </p>
                  ) : (
                    stats.recentRecognitions.map((recognition, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                          {recognition.fromUser?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">
                            {recognition.fromUser?.name} →{' '}
                            {recognition.toUser?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {recognition.message}
                          </p>
                          <div className="mt-1 text-xs text-gray-400">
                            {new Date(
                              recognition.createdAt
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>
                Users with highest points this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 animate-pulse"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {!stats?.topPerformers || stats.topPerformers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No top performers data available
                    </p>
                  ) : (
                    stats.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-8 text-center text-gray-500 font-medium">
                          {index + 1}
                        </div>
                        <div className="w-12 h-12 mx-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {performer.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{performer.name}</p>
                          <p className="text-sm text-gray-500">
                            {performer.department || 'No department'}
                          </p>
                        </div>
                        <div className="font-semibold text-amber-500">
                          {performer.points} pts
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
