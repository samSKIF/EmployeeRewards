import { useState } from 'react';
import { useLocation } from 'wouter';
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
  ListChecks
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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

const NavItem = ({ icon: Icon, label, onClick, isActive, badge, className, hasDropdown }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center text-center gap-0.5 text-gray-600 hover:text-teal-600 px-1.5 py-0.5 text-xs font-medium transition-colors relative ${
      isActive ? 'text-teal-600' : ''
    } ${className || ''}`}
  >
    <div className={`p-1.5 rounded-full ${isActive ? 'bg-teal-100' : 'bg-gray-100'}`}>
      <Icon className="w-4 h-4" />
    </div>
    <span>{label}</span>
    {badge && (
      <Badge variant="secondary" className="absolute -top-1 -right-1 bg-red-500 text-white h-5 min-w-5 flex items-center justify-center rounded-full text-xs">
        {badge}
      </Badge>
    )}
  </button>
);

const TopNavbar = ({ user }: TopNavbarProps) => {
  const [, navigate] = useLocation();
  const [location] = useLocation();

  // Navigation helper
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("firebaseToken");
    sessionStorage.setItem("skipAutoLogin", "true");
    window.location.href = "/auth";
  };

  // Main navigation items
  const navItems = [
    { icon: Home, label: "Home", onClick: () => navigateTo('/social'), isActive: location === '/social' },
    { icon: Store, label: "Store", onClick: () => navigateTo('/social/shop'), isActive: location === '/social/shop' },
    { icon: ListChecks, label: "Milestones", onClick: () => navigateTo('/user/surveys'), isActive: location === '/user/surveys' },
    { icon: Award, label: "Awards", onClick: () => navigateTo('/recognize'), isActive: location === '/recognize' },
    { icon: Eye, label: "Insights", onClick: () => navigateTo('/insights'), isActive: location === '/insights' },
    { icon: Users, label: "Manage", onClick: () => navigateTo('/manage'), isActive: location === '/manage' },
    { icon: Settings, label: "Setup", onClick: () => navigateTo('/setup'), isActive: location === '/setup' },
  ];

  // Admin dropdown menu items
  const adminItems = [
    { 
      icon: Shield, 
      label: "Admin Dashboard", 
      onClick: () => navigateTo('/admin/dashboard')
    },
    { 
      icon: Users, 
      label: "Employee Management", 
      onClick: () => navigateTo('/admin/employees')
    },
    { 
      icon: ClipboardList, 
      label: "Onboarding", 
      onClick: () => navigateTo('/admin/onboarding')
    },
    { 
      icon: Palette, 
      label: "Brand Identity", 
      onClick: () => navigateTo('/admin/branding')
    },
    { 
      icon: Store, 
      label: "Shop Configuration", 
      onClick: () => navigateTo('/admin/shop/config')
    },
    { 
      icon: FileText, 
      label: "Surveys", 
      onClick: () => navigateTo('/admin/surveys')
    }
  ];

  return (
    <div className="bg-gray-100 pt-2 pb-1 px-4">
      <div className="bg-white rounded-full shadow-sm mx-auto max-w-6xl flex items-center justify-between py-1 px-3">
        {/* Logo */}
        <div className="flex items-center mr-3">
          <div className="bg-teal-500 text-white rounded-full p-2 mr-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
              <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9H9.01" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 9H15.01" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Compact Search box */}
        <div className="relative w-52 mx-2 hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
            <Search className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <input 
            type="search" 
            className="block w-full py-1 px-2 pl-7 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-transparent"
            placeholder="Search..." 
          />
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
          {/* Notifications */}
          <button className="relative p-0.5">
            <Bell className="w-4 h-4 text-gray-600" />
            <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">1</span>
          </button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center">
                <Avatar className="h-6 w-6 border-2 border-teal-100">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                    {user?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigateTo('/user/profile')}>
                <User className="w-4 h-4 mr-2" />
                <span>Profile</span>
              </DropdownMenuItem>
              
              {user?.isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Admin</DropdownMenuLabel>
                  {adminItems.map((item, index) => (
                    <DropdownMenuItem key={index} onClick={item.onClick}>
                      <item.icon className="w-4 h-4 mr-2" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopNavbar;