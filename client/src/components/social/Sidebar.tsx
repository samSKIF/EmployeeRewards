import { useState } from 'react';
import { useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBranding } from '@/context/BrandingContext';
import {
  ShoppingCart,
  Shield,
  Users,
  ClipboardList,
  Store,
  BarChart2,
  Home,
  Award,
  CircleDollarSign,
  FileText,
  LogOut,
  LucideIcon,
  MessageCircle,
  GitBranch,
} from 'lucide-react';
import { SpacesDiscoveryWidget } from '@/components/spaces/SpacesDiscoveryWidget';
// Removed ModularAdminSidebar import as it doesn't exist

interface SidebarProps {
  user: {
    id?: number;
    username?: string;
    name?: string;
    isAdmin?: boolean;
    email?: string;
    avatarUrl?: string;
  } | null;
  closeMobileMenu: () => void;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: string | number;
  className?: string;
}

const MenuItem = ({
  icon: Icon,
  label,
  onClick,
  isActive,
  badge,
  className,
}: MenuItemProps) => (
  <button
    onClick={onClick}
    className={`flex items-center text-gray-600 hover:text-gray-900 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-100 ${
      isActive ? 'bg-gray-100 text-gray-900' : ''
    } ${className || ''}`}
  >
    <Icon className="w-5 h-5 mr-3" />
    <span>{label}</span>
    {badge && (
      <span className="ml-auto bg-gray-200 text-xs rounded-full px-2 py-0.5">
        {badge}
      </span>
    )}
  </button>
);

const Sidebar = ({ user, closeMobileMenu }: SidebarProps) => {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { branding } = useBranding();

  // Navigation helper
  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('firebaseToken');
    sessionStorage.setItem('skipAutoLogin', 'true');
    window.location.href = '/auth';
  };

  // Main menu items
  const mainMenuItems = [
    {
      icon: Home,
      label: 'Home',
      onClick: () => navigateTo('/social'),
      isActive: location === '/social',
    },
    {
      icon: Award,
      label: 'Recognition',
      onClick: () => navigateTo('/recognition'),
      isActive: location === '/recognition',
    },
    {
      icon: MessageCircle,
      label: 'Spaces',
      onClick: () => navigateTo('/spaces'),
      isActive: location === '/spaces',
    },
    {
      icon: CircleDollarSign,
      label: 'Reward Budgets',
      onClick: () => navigateTo('/budgets'),
      isActive: location === '/budgets',
    },
    {
      icon: ShoppingCart,
      label: 'Rewards',
      onClick: () => navigateTo('/social/shop'),
      isActive: location === '/social/shop',
    },
    {
      icon: BarChart2,
      label: 'Leaderboard',
      onClick: () => navigateTo('/leaderboard'),
      isActive: location === '/leaderboard',
    },
    {
      icon: FileText,
      label: 'Surveys',
      onClick: () => navigateTo('/user/surveys'),
      isActive: location === '/user/surveys',
    },
    {
      icon: Users,
      label: 'Groups',
      onClick: () => navigateTo('/groups'),
      isActive: location === '/groups',
    },
    {
      icon: GitBranch,
      label: 'Org Chart',
      onClick: () => navigateTo('/org-chart'),
      isActive: location === '/org-chart',
    },
  ];

  // Legacy admin console items - replaced by ModularAdminSidebar
  // Keeping for backwards compatibility if needed
  const legacyAdminConsoleItems = [
    {
      icon: Shield,
      label: 'Admin Dashboard',
      onClick: () => navigateTo('/admin/dashboard'),
      isActive: location === '/admin/dashboard',
    },
  ];

  return (
    <aside className="bg-white text-gray-800 w-64 p-4 h-full overflow-y-auto border-r border-gray-200">
      {/* Logo/Brand area */}
      <div className="flex items-center mb-6 pl-2">
        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.organizationName || 'Company Logo'}
            className="h-8 w-8 mr-2 object-contain"
          />
        ) : (
          <div className="text-teal-500 mr-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 9H9.01"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 9H15.01"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <h1 className="font-bold text-xl">
          {branding?.organizationName || 'ThrivioHR'}
        </h1>
      </div>

      {/* User profile summary */}
      <div className="flex items-center mb-6 bg-gray-50 p-3 rounded-lg">
        <Avatar className="h-10 w-10 border-2 border-gray-100 flex-shrink-0">
          <AvatarImage src={user?.avatarUrl} alt={user?.name || 'User'} />
          <AvatarFallback className="bg-teal-100 text-teal-700">
            {user?.name?.charAt(0) || 'A'}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="text-gray-800 font-medium">
            {user?.name || 'Admin User'}
          </p>
          <p className="text-xs text-amber-500 flex items-center">
            <span className="mr-1">★</span>
            <span>580</span>
            <span className="ml-2 text-green-500">Online</span>
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {/* Main Menu Items */}
        {mainMenuItems.map((item, index) => (
          <MenuItem
            key={index}
            icon={item.icon}
            label={item.label}
            onClick={item.onClick}
            isActive={item.isActive}
          />
        ))}

        {/* Admin Console - Note: Admin functions now in top navigation dropdown */}
        {(user?.isAdmin === true || user?.email === 'admin@canva.com') && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Admin Console
            </div>
            <p className="px-3 py-2 text-xs text-gray-400">
              Admin functions are available in the top navigation dropdown
            </p>
          </div>
        )}
      </div>

      {/* Groups Discovery Widget */}
      <div className="mt-8 px-3">
        <SpacesDiscoveryWidget />
      </div>

      {/* Logout button */}
      <div className="mt-8 border-t border-gray-200 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center text-gray-600 hover:text-gray-900 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-100"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
