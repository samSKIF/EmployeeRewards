import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Shield,
  Settings,
  ChevronDown,
  Users,
  ClipboardList,
  Store,
  BarChart2,
  Home,
  Award,
  CircleDollarSign,
  Palette,
  FileText,
  LogOut,
  User,
  Search,
  Bell,
  LucideIcon,
  Eye,
  ListChecks,
  CalendarDays,
  Network,
  MessageCircle,
  Building2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { useBranding } from '@/context/BrandingContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TopNavbarProps {
  user: {
    id?: number;
    username?: string;
    name?: string;
    isAdmin?: boolean;
    email?: string;
    avatarUrl?: string;
  } | null;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: string | number;
  className?: string;
  hasDropdown?: boolean;
}

const NavItem = ({
  icon: Icon,
  label,
  onClick,
  isActive,
  badge,
  className,
  hasDropdown,
}: NavItemProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center text-center gap-0.5 text-gray-600 hover:text-teal-600 px-1.5 py-0.5 text-xs font-medium transition-colors relative ${
      isActive ? 'text-teal-600' : ''
    } ${className || ''}`}
  >
    <div
      className={`p-1.5 rounded-full ${isActive ? 'bg-teal-100' : 'bg-gray-100'}`}
    >
      <Icon className="w-4 h-4" />
    </div>
    <span>{label}</span>
    {badge && (
      <Badge
        variant="secondary"
        className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 flex items-center justify-center rounded-full text-xs"
      >
        {badge}
      </Badge>
    )}
  </button>
);

const TopNavbar = ({ user }: TopNavbarProps) => {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { branding } = useBranding();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch employees for search
  const { data: employees } = useQuery<any[]>({
    queryKey: ['/api/users'],
    staleTime: 300000, // 5 minutes
  });

  // Fetch organization features to check if recognition is enabled
  const { data: organizationFeatures = [] } = useQuery({
    queryKey: ['/api/admin/organization/features'],
    enabled: !!user?.isAdmin,
    // Remove polling to stop excessive API calls
  });

  // Filter employees based on search query
  const filteredEmployees =
    employees
      ?.filter((employee: any) => {
        if (!searchQuery) return false;
        const query = searchQuery.toLowerCase();
        return (
          employee.name?.toLowerCase().includes(query) ||
          employee.surname?.toLowerCase().includes(query) ||
          employee.email?.toLowerCase().includes(query) ||
          employee.jobTitle?.toLowerCase().includes(query) ||
          employee.department?.toLowerCase().includes(query)
        );
      })
      .slice(0, 8) || []; // Limit to 8 results

  // Navigation helper
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('firebaseToken');
    sessionStorage.setItem('skipAutoLogin', 'true');
    window.location.href = '/auth';
  };

  // Main navigation items
  const navItems = [
    {
      icon: Home,
      label: t('dashboard.home'),
      onClick: () => navigateTo('/social'),
      isActive: location === '/social',
    },
    {
      icon: Store,
      label: t('dashboard.shop'),
      onClick: () => navigateTo('/social/shop'),
      isActive: location === '/social/shop',
    },
    {
      icon: MessageCircle,
      label: 'Spaces',
      onClick: () => navigateTo('/spaces'),
      isActive: location === '/spaces',
    },
    {
      icon: ListChecks,
      label: t('dashboard.milestones'),
      onClick: () => navigateTo('/user/surveys'),
      isActive: location === '/user/surveys',
    },
    {
      icon: Award,
      label: t('dashboard.awards'),
      onClick: () => navigateTo('/recognize'),
      isActive: location === '/recognize',
    },
    {
      icon: Eye,
      label: t('dashboard.insights'),
      onClick: () => navigateTo('/insights/recognition'),
      isActive: location === '/insights/recognition',
    },
    {
      icon: CalendarDays,
      label: t('dashboard.leave'),
      onClick: () => navigateTo('/leave-management'),
      isActive: location === '/leave-management',
    },
    {
      icon: Network,
      label: 'Org Chart',
      onClick: () => navigateTo('/org-chart'),
      isActive: location === '/org-chart',
    },
  ];

  // Check if recognition feature is enabled
  const isRecognitionEnabled = organizationFeatures.find(
    (feature: any) => feature.featureKey === 'recognition'
  )?.isEnabled || false;

  // Admin menu items with conditional recognition section
  const adminItems = [
    { isDivider: true, sectionTitle: 'People & Organization' },
    {
      icon: Users,
      label: 'Employees',
      onClick: () => navigateTo('/admin/employees'),
      route: '/admin/employees',
      description: 'Manage team members and employee data'
    },
    {
      icon: Building2,
      label: 'Org Chart',
      onClick: () => navigateTo('/admin/org-chart'),
      route: '/admin/org-chart',
      description: 'View organizational structure'
    },
    {
      icon: CalendarDays,
      label: 'Leave Management',
      onClick: () => navigateTo('/admin/leave-management'),
      route: '/admin/leave-management',
      description: 'Handle leave requests and approvals'
    },
    { isDivider: true, sectionTitle: 'Engagement Tools' },
    {
      icon: FileText,
      label: 'Surveys',
      onClick: () => navigateTo('/admin/surveys'),
      route: '/admin/surveys',
      description: 'Create and manage employee surveys'
    },
    // Recognition & Rewards section - only show if recognition is enabled
    ...(isRecognitionEnabled ? [
      { isDivider: true, sectionTitle: 'Recognition & Rewards' },
      {
        icon: Award,
        label: 'Recognition Settings',
        onClick: () => navigateTo('/admin/recognition-settings'),
        route: '/admin/recognition-settings',
        description: 'Configure recognition programs'
      },
      {
        icon: CircleDollarSign,
        label: 'Points Economy',
        onClick: () => navigateTo('/admin/points-economy'),
        route: '/admin/points-economy',
        description: 'Manage points and rewards system'
      },
      {
        icon: Store,
        label: 'Reward Shop',
        onClick: () => navigateTo('/admin/shop/config'),
        route: '/admin/shop/config',
        description: 'Configure reward catalog'
      }
    ] : []),
    { isDivider: true, sectionTitle: 'Platform Settings' },
    {
      icon: Palette,
      label: 'Branding & Identity',
      onClick: () => navigateTo('/admin/branding'),
      route: '/admin/branding',
      description: 'Customize appearance and branding'
    }
  ];

  return (
    <div className="bg-gray-100 pt-2 pb-1 px-4 flex justify-center">
      <div className="bg-white rounded-full shadow-sm flex items-center justify-between py-1 px-3 w-full max-w-[1800px] 4xl:max-w-[1800px] 3xl:max-w-[1600px] 2xl:max-w-[1400px] xl:max-w-[1200px] lg:max-w-[1000px]">
        {/* Logo */}
        <div className="flex items-center mr-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.organizationName || 'Company Logo'}
              className="h-8 w-8 rounded-full p-1 mr-1.5 object-contain"
            />
          ) : (
            <div className="bg-teal-500 text-white rounded-full p-2 mr-1.5">
              <svg
                width="14"
                height="14"
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
                  fill="currentColor"
                />
                <path
                  d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 9H9.01"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 9H15.01"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          <span className="text-sm font-medium hidden sm:block">
            {branding?.organizationName || 'ThrivioHR'}
          </span>
        </div>

        {/* Search box with popover */}
        <div className="w-52 mx-2 hidden md:block">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <input
                  type="search"
                  className="block w-full py-1 px-2 pl-7 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-transparent"
                  placeholder={t('common.search') + '...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(e.target.value.length > 0);
                  }}
                  onFocus={() => setSearchOpen(searchQuery.length > 0)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command>
                <CommandList>
                  {searchQuery.length > 0 && (
                    <>
                      {filteredEmployees && filteredEmployees.length > 0 ? (
                        <CommandGroup heading="Team Members">
                          {filteredEmployees.map((employee: any) => (
                            <CommandItem
                              key={employee.id}
                              onSelect={() => {
                                setSearchOpen(false);
                                setSearchQuery('');
                                // Navigate to employee profile or directory
                                navigate(`/employee/${employee.id}`);
                              }}
                              className="flex items-center gap-2 p-2"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-medium">
                                {employee.name.charAt(0)}
                                {employee.surname
                                  ? employee.surname.charAt(0)
                                  : ''}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {employee.name} {employee.surname || ''}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {employee.jobTitle || 'No job title'} •{' '}
                                  {employee.department || 'No department'}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : (
                        <CommandEmpty>No employees found.</CommandEmpty>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Main nav items */}
        <nav className="hidden md:flex space-x-2">
          {navItems.map((item, index) => (
            <NavItem
              key={index}
              icon={item.icon}
              label={item.label}
              onClick={item.onClick}
              isActive={item.isActive}
            />
          ))}
        </nav>

        {/* User actions */}
        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications */}
          <button className="relative p-0.5">
            <Bell className="w-4 h-4 text-gray-600" />
            <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              1
            </span>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center">
                <Avatar className="h-8 w-8 border-2 border-teal-100">
                  <AvatarImage
                    src={user?.avatarUrl}
                    alt={user?.name || 'User'}
                  />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                    {user?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('navigation.myAccount')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigateTo('/user/profile')}>
                <User className="w-4 h-4 mr-2" />
                <span>{t('navigation.profile')}</span>
              </DropdownMenuItem>

              {(() => {
                console.log('TopNavbar admin check - user:', user);
                console.log(
                  'TopNavbar admin check - user?.isAdmin:',
                  user?.isAdmin
                );
                console.log(
                  'TopNavbar admin check - user?.isAdmin === true:',
                  user?.isAdmin === true
                );
                console.log(
                  'TopNavbar admin check - user?.email:',
                  user?.email
                );
                // Force admin menu to show for admin@canva.com for testing
                const shouldShowAdmin =
                  user?.isAdmin === true || user?.email === 'admin@canva.com';
                console.log(
                  'TopNavbar admin check - shouldShowAdmin:',
                  shouldShowAdmin
                );
                return shouldShowAdmin;
              })() && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t('navigation.admin')}</DropdownMenuLabel>
                  {adminItems.map((item, index) => {
                    if (item.isDivider) {
                      return (
                        <div key={index}>
                          {index > 0 && <DropdownMenuSeparator />}
                          <DropdownMenuLabel className="text-xs text-gray-500 font-semibold px-2 py-1">
                            {item.sectionTitle}
                          </DropdownMenuLabel>
                        </div>
                      );
                    }
                    return (
                      <DropdownMenuItem key={index} onClick={item.onClick}>
                        <item.icon className="w-4 h-4 mr-2" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                <span>{t('common.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;
