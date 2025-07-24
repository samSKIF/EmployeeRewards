import { 
  Users, 
  Building2, 
  CalendarDays, 
  UserPlus, 
  MessageCircle,
  Megaphone,
  Calendar,
  FileText,
  Settings as SettingsIcon,
  Award,
  CircleDollarSign,
  Store,
  BarChart3,
  PieChart,
  TrendingUp,
  Palette,
  Shield,
  CreditCard,
  Plug,
  LucideIcon
} from 'lucide-react';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  route: string;
  isActive?: boolean;
  badge?: string | number;
  description?: string;
}

export interface MenuSection {
  id: string;
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  isCollapsible?: boolean;
  isExpanded?: boolean;
  requiresFeature?: string; // Feature key required for this section to show
}

export interface AdminMenuConfig {
  sections: MenuSection[];
}

/**
 * Creates the admin sidebar menu configuration based on user permissions and organization features
 */
export function createAdminMenuConfig(
  currentRoute: string,
  organizationFeatures: { featureKey: string; isEnabled: boolean }[] = []
): AdminMenuConfig {
  
  // Helper function to check if a feature is enabled
  const isFeatureEnabled = (featureKey: string): boolean => {
    const feature = organizationFeatures.find(f => f.featureKey === featureKey);
    return feature?.isEnabled ?? false;
  };

  // Helper function to mark active route
  const isRouteActive = (route: string): boolean => {
    return currentRoute === route || currentRoute.startsWith(route + '/');
  };

  const menuConfig: AdminMenuConfig = {
    sections: [
      // 1. People & Organization
      {
        id: 'people-org',
        title: 'People & Organization',
        icon: Users,
        isCollapsible: true,
        isExpanded: currentRoute.startsWith('/admin/employees') || 
                   currentRoute.startsWith('/admin/org-chart') || 
                   currentRoute.startsWith('/admin/leave') ||
                   currentRoute.startsWith('/admin/onboarding') ||
                   currentRoute.startsWith('/admin/spaces'),
        items: [
          {
            icon: Users,
            label: 'Employees',
            route: '/admin/employees',
            isActive: isRouteActive('/admin/employees'),
            description: 'Manage team members and employee data'
          },
          {
            icon: Building2,
            label: 'Org Chart',
            route: '/admin/org-chart',
            isActive: isRouteActive('/admin/org-chart'),
            description: 'View organizational structure'
          },
          {
            icon: CalendarDays,
            label: 'Leave Management',
            route: '/admin/leave-management',
            isActive: isRouteActive('/admin/leave-management'),
            description: 'Handle leave requests and approvals'
          },
          {
            icon: UserPlus,
            label: 'Onboarding',
            route: '/admin/onboarding',
            isActive: isRouteActive('/admin/onboarding'),
            description: 'Employee onboarding workflows'
          },
          {
            icon: MessageCircle,
            label: 'Spaces & Groups',
            route: '/admin/spaces',
            isActive: isRouteActive('/admin/spaces'),
            description: 'Manage workplace communities'
          }
        ]
      },

      // 2. Engagement Tools
      {
        id: 'engagement',
        title: 'Engagement Tools',
        icon: Megaphone,
        isCollapsible: true,
        isExpanded: currentRoute.startsWith('/admin/campaigns') || 
                   currentRoute.startsWith('/admin/celebrations') || 
                   currentRoute.startsWith('/admin/surveys') ||
                   currentRoute.startsWith('/admin/posts'),
        items: [
          {
            icon: Megaphone,
            label: 'Campaigns & Missions',
            route: '/admin/campaigns',
            isActive: isRouteActive('/admin/campaigns'),
            description: 'Create engagement campaigns'
          },
          {
            icon: Calendar,
            label: 'Celebration Settings',
            route: '/admin/celebrations',
            isActive: isRouteActive('/admin/celebrations'),
            description: 'Configure birthdays and anniversaries'
          },
          {
            icon: FileText,
            label: 'Surveys',
            route: '/admin/surveys',
            isActive: isRouteActive('/admin/surveys'),
            description: 'Create and manage employee surveys'
          },
          {
            icon: SettingsIcon,
            label: 'Posts & Feed Settings',
            route: '/admin/posts-settings',
            isActive: isRouteActive('/admin/posts-settings'),
            description: 'Configure social feed settings'
          }
        ]
      },

      // 3. Recognition & Rewards (Conditional)
      {
        id: 'recognition-rewards',
        title: 'Recognition & Rewards',
        icon: Award,
        requiresFeature: 'recognition', // Only show if recognition is enabled
        isCollapsible: true,
        isExpanded: currentRoute.startsWith('/admin/recognition') || 
                   currentRoute.startsWith('/admin/points') || 
                   currentRoute.startsWith('/admin/shop'),
        items: [
          {
            icon: Award,
            label: 'Recognition Settings',
            route: '/admin/recognition-settings',
            isActive: isRouteActive('/admin/recognition-settings'),
            description: 'Configure recognition programs'
          },
          {
            icon: CircleDollarSign,
            label: 'Points Economy',
            route: '/admin/points-economy',
            isActive: isRouteActive('/admin/points-economy'),
            description: 'Manage points and rewards system'
          },
          {
            icon: Store,
            label: 'Reward Shop',
            route: '/admin/shop/config',
            isActive: isRouteActive('/admin/shop'),
            description: 'Configure reward catalog'
          }
        ]
      },

      // 4. Analytics & Reports
      {
        id: 'analytics',
        title: 'Analytics & Reports',
        icon: BarChart3,
        isCollapsible: true,
        isExpanded: currentRoute.startsWith('/admin/analytics') || 
                   currentRoute.startsWith('/admin/reports') || 
                   currentRoute.startsWith('/admin/insights'),
        items: [
          {
            icon: TrendingUp,
            label: 'Engagement Analytics',
            route: '/admin/analytics/engagement',
            isActive: isRouteActive('/admin/analytics/engagement'),
            description: 'Employee engagement metrics'
          },
          {
            icon: PieChart,
            label: 'Survey Reports',
            route: '/admin/reports/surveys',
            isActive: isRouteActive('/admin/reports/surveys'),
            description: 'Survey response analytics'
          },
          // Recognition insights only if recognition is enabled
          ...(isFeatureEnabled('recognition') ? [{
            icon: Award,
            label: 'Recognition Insights',
            route: '/admin/recognition-analytics',
            isActive: isRouteActive('/admin/recognition-analytics'),
            description: 'Recognition program analytics'
          }] : [])
        ]
      },

      // 5. Platform Settings
      {
        id: 'platform-settings',
        title: 'Platform Settings',
        icon: SettingsIcon,
        isCollapsible: true,
        isExpanded: currentRoute.startsWith('/admin/branding') || 
                   currentRoute.startsWith('/admin/permissions') || 
                   currentRoute.startsWith('/admin/subscription') ||
                   currentRoute.startsWith('/admin/integrations'),
        items: [
          {
            icon: Palette,
            label: 'Branding & Identity',
            route: '/admin/branding',
            isActive: isRouteActive('/admin/branding'),
            description: 'Customize appearance and branding'
          },
          {
            icon: Shield,
            label: 'Permissions & Roles',
            route: '/admin/permissions',
            isActive: isRouteActive('/admin/permissions'),
            description: 'Manage user roles and permissions'
          },
          {
            icon: CreditCard,
            label: 'Subscription & Usage',
            route: '/admin/subscription',
            isActive: isRouteActive('/admin/subscription'),
            description: 'View subscription and usage details'
          },
          {
            icon: Plug,
            label: 'Integrations',
            route: '/admin/integrations',
            isActive: isRouteActive('/admin/integrations'),
            description: 'Configure external integrations'
          }
        ]
      }
    ].filter(section => {
      // Filter out sections that require features not enabled
      if (section.requiresFeature) {
        return isFeatureEnabled(section.requiresFeature);
      }
      return true;
    })
  };

  return menuConfig;
}

/**
 * Hook to get organization features for the current user's organization
 */
export function useOrganizationFeatures() {
  // For now, we'll use recognition settings as a proxy for recognition enablement
  // In a full implementation, this would fetch from /api/organization/features
  // For ThrivioHR, recognition is enabled if the organization has recognition settings
  
  // Check if recognition is enabled by attempting to fetch recognition settings
  // If the settings exist and are accessible, recognition is enabled
  
  // Since we can't use React hooks here directly in config function,
  // we'll return a default configuration that enables recognition
  // The actual hook implementation would be in the component that uses this config
  
  return [
    { featureKey: 'recognition', isEnabled: true }, // Always enabled for ThrivioHR
    { featureKey: 'social', isEnabled: true },
    { featureKey: 'surveys', isEnabled: true },
    { featureKey: 'marketplace', isEnabled: true }
  ];
}

// Export the config function for use in other components like TopNavbar
export const getAdminMenuConfig = AdminSidebarConfig;

export default AdminSidebarConfig;