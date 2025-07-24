import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Award,
  TrendingUp,
  Users,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  MessageSquare,
  Download,
  Filter,
  Search,
  Zap,
  Heart,
  Star,
  Trophy,
  Bot,
  Send,
  Lightbulb,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Area,
  AreaChart,
  Pie,
} from 'recharts';

// Sample data for demonstration
const recognitionTrends = [
  { month: 'Jan', recognitions: 145, points: 2850, employees: 89 },
  { month: 'Feb', recognitions: 168, points: 3240, employees: 92 },
  { month: 'Mar', recognitions: 192, points: 3680, employees: 95 },
  { month: 'Apr', recognitions: 215, points: 4200, employees: 98 },
  { month: 'May', recognitions: 238, points: 4650, employees: 101 },
  { month: 'Jun', recognitions: 267, points: 5180, employees: 105 },
];

const departmentData = [
  {
    department: 'Engineering',
    recognitions: 89,
    points: 1780,
    participation: 92,
  },
  { department: 'Sales', recognitions: 67, points: 1340, participation: 85 },
  { department: 'Marketing', recognitions: 45, points: 900, participation: 78 },
  { department: 'HR', recognitions: 34, points: 680, participation: 95 },
  { department: 'Finance', recognitions: 28, points: 560, participation: 71 },
];

const topRecognizers = [
  {
    name: 'Sarah Johnson',
    department: 'Engineering',
    given: 15,
    received: 8,
    points: 320,
  },
  {
    name: 'Michael Chen',
    department: 'Sales',
    given: 12,
    received: 11,
    points: 290,
  },
  {
    name: 'Emma Davis',
    department: 'Marketing',
    given: 10,
    received: 9,
    points: 265,
  },
  {
    name: 'David Wilson',
    department: 'Engineering',
    given: 9,
    received: 12,
    points: 245,
  },
  { name: 'Lisa Brown', department: 'HR', given: 8, received: 7, points: 210 },
];

const recognitionCategories = [
  { name: 'Teamwork', value: 35, color: '#8884d8' },
  { name: 'Innovation', value: 28, color: '#82ca9d' },
  { name: 'Customer Focus', value: 22, color: '#ffc658' },
  { name: 'Leadership', value: 15, color: '#ff7300' },
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

interface RecognitionAnalyticsProps {
  isAdmin?: boolean;
  userId?: number;
  teamId?: number;
}

export default function RecognitionAnalytics({
  isAdmin = false,
  userId,
  teamId,
}: RecognitionAnalyticsProps) {
  const [dateRange, setDateRange] = useState('last-6-months');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [chatChart, setChatChart] = useState<any>(null);

  const queryClient = useQueryClient();

  // Get suggested questions
  const { data: suggestions } = useQuery({
    queryKey: ['/api/analytics/suggestions'],
    enabled: true,
  });

  // AI Chat mutation
  const askAI = useMutation({
    mutationFn: async (question: string) => {
      const response = await fetch('/api/analytics/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      const userMessage = {
        id: Date.now() - 1,
        type: 'user',
        content: currentQuestion,
        timestamp: new Date(),
      };
      const aiMessage = {
        id: Date.now(),
        type: 'ai',
        content: data.answer,
        insights: data.insights,
        chart: data.chartConfig,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage, aiMessage]);
      if (data.chartConfig) {
        setChatChart(data.chartConfig);
      }
      setCurrentQuestion('');
    },
    onError: (error) => {
      console.error('AI Chat error:', error);
      const userMessage = {
        id: Date.now() - 1,
        type: 'user',
        content: currentQuestion,
        timestamp: new Date(),
      };
      const errorMessage = {
        id: Date.now(),
        type: 'ai',
        content:
          'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage, errorMessage]);
      setCurrentQuestion('');
    },
  });

  const handleAskQuestion = (question: string) => {
    if (!question.trim()) return;
    setCurrentQuestion(question);
    askAI.mutate(question);
  };

  // In a real implementation, these would fetch from your API
  const { data: analytics } = useQuery({
    queryKey: [
      '/api/recognition/analytics',
      { dateRange, department: selectedDepartment, userId, teamId },
    ],
    queryFn: () =>
      Promise.resolve({
        totalRecognitions: 1247,
        totalPoints: 24580,
        activeParticipants: 156,
        averagePerEmployee: 8.2,
        trends: recognitionTrends,
        departments: departmentData,
        topUsers: topRecognizers,
        categories: recognitionCategories,
      }),
  });

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = 'blue',
  }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className="text-xs text-muted-foreground">
            <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
              {change > 0 ? '+' : ''}
              {change}%
            </span>{' '}
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Recognition Analytics
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Organization-wide recognition insights'
              : "Your team's recognition performance"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          {isAdmin && (
            <Button size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Configure Alerts
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="last-30-days">Last 30 days</SelectItem>
            <SelectItem value="last-3-months">Last 3 months</SelectItem>
            <SelectItem value="last-6-months">Last 6 months</SelectItem>
            <SelectItem value="last-year">Last year</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-[200px]"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Recognitions"
          value={analytics?.totalRecognitions.toLocaleString() || '1,247'}
          change={12}
          icon={Award}
          color="purple"
        />
        <MetricCard
          title="Points Distributed"
          value={analytics?.totalPoints.toLocaleString() || '24,580'}
          change={8}
          icon={Star}
          color="yellow"
        />
        <MetricCard
          title="Active Participants"
          value={analytics?.activeParticipants || '156'}
          change={5}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Avg per Employee"
          value={analytics?.averagePerEmployee || '8.2'}
          change={-2}
          icon={Target}
          color="green"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="chat">
            <Bot className="w-4 h-4 mr-2" />
            AI Chat
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recognition Trends Chart */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recognition Trends</CardTitle>
                <CardDescription>Monthly recognition activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={recognitionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="recognitions"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recognition Categories */}
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Recognition Categories</CardTitle>
                <CardDescription>
                  Distribution by recognition type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={recognitionCategories}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {recognitionCategories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Recognition Activity</CardTitle>
              <CardDescription>
                Latest recognitions across the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    giver: 'Sarah Johnson',
                    receiver: 'Mike Chen',
                    category: 'Teamwork',
                    points: 50,
                    time: '2 hours ago',
                  },
                  {
                    giver: 'Emma Davis',
                    receiver: 'Lisa Brown',
                    category: 'Innovation',
                    points: 75,
                    time: '4 hours ago',
                  },
                  {
                    giver: 'David Wilson',
                    receiver: 'Sarah Johnson',
                    category: 'Leadership',
                    points: 100,
                    time: '6 hours ago',
                  },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-purple-100 p-2 rounded-full">
                        <Award className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          <span className="text-blue-600">
                            {activity.giver}
                          </span>{' '}
                          recognized{' '}
                          <span className="text-green-600">
                            {activity.receiver}
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Category: {activity.category} • {activity.points}{' '}
                          points
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">{activity.points} pts</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recognition & Points Trends</CardTitle>
              <CardDescription>
                Track recognition patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={recognitionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="recognitions"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="points"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="employees"
                    stroke="#ffc658"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>
                Recognition metrics by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="recognitions" fill="#8884d8" />
                  <Bar dataKey="participation" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Recognizers</CardTitle>
                <CardDescription>
                  Employees giving the most recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRecognizers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.department}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{user.given} given</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.points} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Recognized</CardTitle>
                <CardDescription>
                  Employees receiving the most recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRecognizers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.department}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {user.received} received
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.points} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                  Smart Recommendations
                </CardTitle>
                <CardDescription>
                  AI-powered insights for improvement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">Engagement Opportunity</h4>
                    <p className="text-sm text-muted-foreground">
                      Finance team has 29% lower recognition activity. Consider
                      a team-building initiative.
                    </p>
                  </div>
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium">Positive Trend</h4>
                    <p className="text-sm text-muted-foreground">
                      Cross-department recognitions increased 35% this month -
                      great collaboration!
                    </p>
                  </div>
                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-medium">Recognition Gap</h4>
                    <p className="text-sm text-muted-foreground">
                      12 employees haven't received recognition in 45 days. Send
                      nudges to managers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2 text-red-500" />
                  Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Recognition message sentiment trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Positive Sentiment</span>
                    <span className="text-sm font-medium text-green-600">
                      87%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: '87%' }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Neutral Sentiment</span>
                    <span className="text-sm font-medium text-gray-600">
                      11%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{ width: '11%' }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Negative Sentiment</span>
                    <span className="text-sm font-medium text-red-600">2%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: '2%' }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-blue-500" />
                    AI Analytics Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask questions about your recognition data in natural
                    language
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">
                          Welcome to AI Analytics!
                        </p>
                        <p className="text-sm">
                          Ask me anything about your recognition data.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.type === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-white border shadow-sm'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            {message.chart && (
                              <div className="mt-3 p-2 bg-gray-50 rounded">
                                <p className="text-xs text-gray-600 mb-2">
                                  Generated Chart
                                </p>
                                <div className="h-40 bg-white rounded flex items-center justify-center">
                                  <BarChart3 className="h-8 w-8 text-gray-400" />
                                  <span className="ml-2 text-sm text-gray-500">
                                    Chart visualization
                                  </span>
                                </div>
                              </div>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    {askAI.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-white border shadow-sm p-3 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span className="text-sm">AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Ask about recognition trends, departments, top performers..."
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !askAI.isPending) {
                          handleAskQuestion(currentQuestion);
                        }
                      }}
                      disabled={askAI.isPending}
                    />
                    <Button
                      onClick={() => handleAskQuestion(currentQuestion)}
                      disabled={!currentQuestion.trim() || askAI.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Suggested Questions & Help */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                    Suggested Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(
                      suggestions?.suggestions || [
                        'Which department has the most engagement this month?',
                        'Show me sentiment trends in Sales over last quarter',
                        'Who are our top 5 recognizers?',
                        "What's the recognition trend for the last 6 months?",
                        'Which team needs more recognition?',
                        'How does Engineering compare to other departments?',
                      ]
                    ).map((question: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full text-left h-auto p-3 justify-start"
                        onClick={() => handleAskQuestion(question)}
                        disabled={askAI.isPending}
                      >
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-sm">{question}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>How to Use</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                        1
                      </div>
                      <p>
                        Ask questions in natural language about recognition data
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                        2
                      </div>
                      <p>
                        Get instant insights with generated charts and analysis
                      </p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                        3
                      </div>
                      <p>Export results or ask follow-up questions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {chatChart && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                      <PieChart className="h-8 w-8 text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">
                        Interactive chart would appear here
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
