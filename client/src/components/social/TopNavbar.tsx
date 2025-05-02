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
  LucideIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TopNavbarProps {
  user: {
    id?: number;
    username?: string;
    name?: string;
    isAdmin?: boolean;
    email?: string;
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
    className={`flex items-center text-white hover:text-white/90 px-3 py-2 text-sm font-medium transition-colors relative ${
      isActive ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-white after:rounded-t-md' : ''
    } ${className || ''}`}
  >
    <Icon className="w-5 h-5 mr-1.5" />
    <span>{label}</span>
    {hasDropdown && <ChevronDown className="w-4 h-4 ml-1" />}
    {badge && (
      <Badge variant="secondary" className="ml-1.5 bg-white text-teal-600 h-5 min-w-5 flex items-center justify-center rounded-full">
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
    { 
      icon: Users, 
      label: "Spaces", 
      onClick: () => {}, 
      isActive: location === '/spaces',
      hasDropdown: true
    },
    { icon: Award, label: "Awards", onClick: () => navigateTo('/recognize'), isActive: location === '/recognize' },
    { icon: FileText, label: "Milestones", onClick: () => navigateTo('/user/surveys'), isActive: location === '/user/surveys' },
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
    <header className="bg-teal-500 text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center mr-4">
              <div className="bg-white text-teal-500 rounded-full p-1.5 mr-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 9H9.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9H15.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="font-bold text-xl">ThrivioHR</h1>
            </div>

            {/* Main nav items */}
            <nav className="hidden md:flex space-x-1">
              {navItems.map((item, index) => (
                <NavItem 
                  key={index}
                  icon={item.icon}
                  label={item.label}
                  onClick={item.onClick}
                  isActive={item.isActive}
                  hasDropdown={item.hasDropdown}
                />
              ))}
              
              {/* More menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center text-white hover:text-white/90 px-3 py-2 text-sm font-medium transition-colors">
                    <Settings className="w-5 h-5 mr-1.5" />
                    <span>More</span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigateTo('/leaderboard')}>
                    <BarChart2 className="w-4 h-4 mr-2" /> 
                    <span>Leaderboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo('/budgets')}>
                    <CircleDollarSign className="w-4 h-4 mr-2" /> 
                    <span>Reward Budgets</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo('/groups')}>
                    <Users className="w-4 h-4 mr-2" /> 
                    <span>Groups</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Search and User actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-white/70" />
              </div>
              <input 
                type="search" 
                className="block w-full p-2 pl-10 bg-teal-600/50 border border-teal-400 rounded-full text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Search..." 
              />
            </div>

            {/* Notifications */}
            <button className="relative p-1.5 text-white rounded-full hover:bg-teal-600/50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">6</span>
            </button>

            {/* Points */}
            <div className="hidden sm:flex items-center bg-white/10 rounded-full px-3 py-1 text-sm">
              <span className="mr-1 text-amber-200">★</span>
              <span>580</span>
            </div>

            {/* Cart icon */}
            <button className="relative p-1.5 text-white rounded-full hover:bg-teal-600/50">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">1</span>
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center">
                  <Avatar className="h-8 w-8 border-2 border-white/50">
                    <AvatarFallback className="bg-teal-700 text-white">
                      {user?.name?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigateTo('/profile')}>
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
    </header>
  );
};

export default TopNavbar;