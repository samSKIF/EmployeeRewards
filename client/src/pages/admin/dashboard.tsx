import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Award, 
  TrendingUp, 
  Calendar,
  Building2,
  Settings,
  BarChart3,
  Palette
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('admin.dashboard.title', 'Admin Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('admin.dashboard.subtitle', 'Overview of your ThrivioHR platform')}
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Employees"
            value="247"
            change="+12"
            changeType="positive"
            icon={Users}
          />
          <StatCard
            title="Active Recognitions"
            value="89"
            change="+23"
            changeType="positive"
            icon={Award}
          />
          <StatCard
            title="Engagement Score"
            value="87%"
            change="+5%"
            changeType="positive"
            icon={TrendingUp}
          />
          <StatCard
            title="Pending Requests"
            value="14"
            change="-3"
            changeType="negative"
            icon={Calendar}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>People & Organization</span>
              </CardTitle>
              <CardDescription>
                Manage your team and organizational structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton 
                href="/admin/employees" 
                title="Manage Employees"
                description="View and edit employee profiles"
              />
              <QuickActionButton 
                href="/admin/leave-management" 
                title="Leave Management"
                description="Review pending leave requests"
                badge="14 pending"
              />
              <QuickActionButton 
                href="/admin/onboarding" 
                title="Onboarding"
                description="Setup new employee workflows"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5" />
                <span>Recognition & Rewards</span>
              </CardTitle>
              <CardDescription>
                Configure recognition programs and rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton 
                href="/admin/recognition-settings" 
                title="Recognition Settings"
                description="Configure recognition programs"
              />
              <QuickActionButton 
                href="/admin/shop/config" 
                title="Reward Shop"
                description="Manage reward catalog"
              />
              <QuickActionButton 
                href="/admin/recognition-analytics" 
                title="Recognition Insights"
                description="View recognition analytics"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Analytics & Reports</span>
              </CardTitle>
              <CardDescription>
                Monitor engagement and platform metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton 
                href="/admin/analytics/engagement" 
                title="Engagement Analytics"
                description="Track employee engagement metrics"
              />
              <QuickActionButton 
                href="/admin/reports/surveys" 
                title="Survey Reports"
                description="View survey response analytics"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Platform Settings</span>
              </CardTitle>
              <CardDescription>
                Configure platform appearance and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton 
                href="/admin/branding" 
                title="Branding & Identity"
                description="Customize platform appearance"
              />
              <QuickActionButton 
                href="/admin/permissions" 
                title="Permissions & Roles"
                description="Manage user access control"
              />
              <QuickActionButton 
                href="/admin/subscription" 
                title="Subscription & Usage"
                description="View subscription details"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeType, icon: Icon }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={`text-sm ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {change} from last month
          </p>
        </div>
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    </CardContent>
  </Card>
);

interface QuickActionButtonProps {
  href: string;
  title: string;
  description: string;
  badge?: string;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ href, title, description, badge }) => (
  <a
    href={href}
    className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
  >
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      {badge && <Badge variant="secondary">{badge}</Badge>}
    </div>
  </a>
);

export default AdminDashboard;