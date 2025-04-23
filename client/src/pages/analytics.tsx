import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Minus, Award, Users, ShoppingBag } from 'lucide-react';

import type { 
  PointsDistribution, 
  RedemptionTrend, 
  DepartmentEngagement,
  TopPerformer,
  PopularReward,
  AnalyticsSummary
} from '@shared/types';

// Helper to format large numbers
const formatNumber = (num: number) => {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
};

// Colors for charts
const COLORS = [
  '#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#f1c40f', 
  '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085'
];

// Component for the overview metrics
const OverviewMetrics = ({ data }: { data: AnalyticsSummary }) => {
  // Calculate trend icons based on percentage change
  const renderTrendIcon = (percentage: number) => {
    if (percentage > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (percentage < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalUsers}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {renderTrendIcon(data.recentTrends.percentageChange.newUsers)}
            <span className={`ml-1 ${data.recentTrends.percentageChange.newUsers > 0 ? 'text-green-500' : data.recentTrends.percentageChange.newUsers < 0 ? 'text-red-500' : ''}`}>
              {data.recentTrends.percentageChange.newUsers > 0 ? '+' : ''}{data.recentTrends.percentageChange.newUsers}% from last month
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeUsers}</div>
          <div className="text-xs text-muted-foreground">
            {((data.activeUsers / data.totalUsers) * 100).toFixed(1)}% participation rate
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(data.totalPointsAwarded)}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {renderTrendIcon(data.recentTrends.percentageChange.pointsAwarded)}
            <span className={`ml-1 ${data.recentTrends.percentageChange.pointsAwarded > 0 ? 'text-green-500' : data.recentTrends.percentageChange.pointsAwarded < 0 ? 'text-red-500' : ''}`}>
              {data.recentTrends.percentageChange.pointsAwarded > 0 ? '+' : ''}{data.recentTrends.percentageChange.pointsAwarded}% from last month
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalRedemptions}</div>
          <div className="flex items-center text-xs text-muted-foreground">
            {renderTrendIcon(data.recentTrends.percentageChange.pointsRedeemed)}
            <span className={`ml-1 ${data.recentTrends.percentageChange.pointsRedeemed > 0 ? 'text-green-500' : data.recentTrends.percentageChange.pointsRedeemed < 0 ? 'text-red-500' : ''}`}>
              {data.recentTrends.percentageChange.pointsRedeemed > 0 ? '+' : ''}{data.recentTrends.percentageChange.pointsRedeemed}% from last month
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Component for the Points Distribution chart
const PointsDistributionChart = ({ data }: { data: PointsDistribution }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Points Distribution</CardTitle>
        <CardDescription>
          Distribution of points across {data.totalUsers} employees (avg: {data.averagePoints.toFixed(0)})
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.ranges}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} employees (${data.ranges.find(r => r.count === value)?.percentage}%)`,
                'Count'
              ]}
            />
            <Bar dataKey="count" fill="#3498db" name="Employees">
              {data.ranges.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Component for the Redemption Trends chart
const RedemptionTrendsChart = ({ data }: { data: RedemptionTrend[] }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Redemption Trends</CardTitle>
        <CardDescription>
          Monthly redemption activity over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis yAxisId="left" orientation="left" stroke="#3498db" />
            <YAxis yAxisId="right" orientation="right" stroke="#e74c3c" />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#3498db"
              activeDot={{ r: 8 }}
              name="Redemptions"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalPoints"
              stroke="#e74c3c"
              name="Points Spent"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Component for the Department Engagement chart
const DepartmentEngagementChart = ({ data }: { data: DepartmentEngagement[] }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Department Engagement</CardTitle>
        <CardDescription>
          Participation and point metrics by department
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 100,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="department" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="participationRate" fill="#3498db" name="Participation %" />
            <Bar dataKey="avgPointsPerEmployee" fill="#2ecc71" name="Avg Points" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Component for the Top Performers list
const TopPerformersTable = ({ data }: { data: TopPerformer[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>
          Employees with the highest point earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((performer, index) => (
            <div key={performer.id} className="flex items-center space-x-4">
              <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {performer.name} {performer.surname}
                </p>
                <p className="text-xs text-muted-foreground">{performer.department}</p>
              </div>
              <div className="font-medium">{performer.pointsEarned} pts</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Component for the Popular Rewards chart
const PopularRewardsChart = ({ data }: { data: PopularReward[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Rewards</CardTitle>
        <CardDescription>
          Most frequently redeemed items
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="redeemCount"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name, props) => [`${value} redemptions`, props.payload.name]} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Main Analytics Dashboard Component
const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch analytics summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['/api/analytics/summary'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch points distribution data
  const { data: distributionData, isLoading: distributionLoading } = useQuery<PointsDistribution>({
    queryKey: ['/api/analytics/points-distribution'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch redemption trends data
  const { data: trendsData, isLoading: trendsLoading } = useQuery<RedemptionTrend[]>({
    queryKey: ['/api/analytics/redemption-trends'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch department engagement data
  const { data: engagementData, isLoading: engagementLoading } = useQuery<DepartmentEngagement[]>({
    queryKey: ['/api/analytics/department-engagement'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch top performers data
  const { data: performersData, isLoading: performersLoading } = useQuery<TopPerformer[]>({
    queryKey: ['/api/analytics/top-performers'],
    staleTime: 5 * 60 * 1000,
  });
  
  // Fetch popular rewards data
  const { data: rewardsData, isLoading: rewardsLoading } = useQuery<PopularReward[]>({
    queryKey: ['/api/analytics/popular-rewards'],
    staleTime: 5 * 60 * 1000,
  });
  
  const isLoading = summaryLoading || distributionLoading || trendsLoading || 
                    engagementLoading || performersLoading || rewardsLoading;
  
  if (isLoading || !summaryData || !distributionData || !trendsData || 
      !engagementData || !performersData || !rewardsData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-2 text-lg font-medium">Loading analytics data...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">HR Analytics Dashboard</h1>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="points">Points & Redemptions</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="people">People & Rewards</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewMetrics data={summaryData} />
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Points Awarded by Department</CardTitle>
                <CardDescription>
                  Top 5 departments by total points earned
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summaryData.topDepartments}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="pointsEarned" fill="#3498db" name="Points Earned">
                      {summaryData.topDepartments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
                <CardDescription>
                  Points and user activity last month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium">Points Awarded</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {formatNumber(summaryData.recentTrends.pointsAwardedLastMonth)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                        summaryData.recentTrends.percentageChange.pointsAwarded > 0 
                          ? 'bg-green-100 text-green-800' 
                          : summaryData.recentTrends.percentageChange.pointsAwarded < 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {summaryData.recentTrends.percentageChange.pointsAwarded > 0 
                          ? <TrendingUp className="h-3 w-3 mr-1" /> 
                          : summaryData.recentTrends.percentageChange.pointsAwarded < 0 
                            ? <TrendingDown className="h-3 w-3 mr-1" /> 
                            : <Minus className="h-3 w-3 mr-1" />}
                        {summaryData.recentTrends.percentageChange.pointsAwarded > 0 ? '+' : ''}
                        {summaryData.recentTrends.percentageChange.pointsAwarded}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">Points Redeemed</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {formatNumber(summaryData.recentTrends.pointsRedeemedLastMonth)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                        summaryData.recentTrends.percentageChange.pointsRedeemed > 0 
                          ? 'bg-green-100 text-green-800' 
                          : summaryData.recentTrends.percentageChange.pointsRedeemed < 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {summaryData.recentTrends.percentageChange.pointsRedeemed > 0 
                          ? <TrendingUp className="h-3 w-3 mr-1" /> 
                          : summaryData.recentTrends.percentageChange.pointsRedeemed < 0 
                            ? <TrendingDown className="h-3 w-3 mr-1" /> 
                            : <Minus className="h-3 w-3 mr-1" />}
                        {summaryData.recentTrends.percentageChange.pointsRedeemed > 0 ? '+' : ''}
                        {summaryData.recentTrends.percentageChange.pointsRedeemed}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium">New Users</div>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">
                        {summaryData.recentTrends.newUsersLastMonth}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full flex items-center ${
                        summaryData.recentTrends.percentageChange.newUsers > 0 
                          ? 'bg-green-100 text-green-800' 
                          : summaryData.recentTrends.percentageChange.newUsers < 0 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {summaryData.recentTrends.percentageChange.newUsers > 0 
                          ? <TrendingUp className="h-3 w-3 mr-1" /> 
                          : summaryData.recentTrends.percentageChange.newUsers < 0 
                            ? <TrendingDown className="h-3 w-3 mr-1" /> 
                            : <Minus className="h-3 w-3 mr-1" />}
                        {summaryData.recentTrends.percentageChange.newUsers > 0 ? '+' : ''}
                        {summaryData.recentTrends.percentageChange.newUsers}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Points & Redemptions Tab */}
        <TabsContent value="points" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <PointsDistributionChart data={distributionData} />
            <RedemptionTrendsChart data={trendsData} />
          </div>
        </TabsContent>
        
        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <DepartmentEngagementChart data={engagementData} />
        </TabsContent>
        
        {/* People & Rewards Tab */}
        <TabsContent value="people" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <TopPerformersTable data={performersData} />
            <PopularRewardsChart data={rewardsData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;