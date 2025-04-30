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
  LucideIcon
} from 'lucide-react';

interface SidebarProps {
  user: {
    id?: number;
    username?: string;
    name?: string;
    isAdmin?: boolean;
    email?: string;
  } | null;
  closeMobileMenu: () => void;
}

interface MenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  badge?: string | number;
}

const MenuItem = ({ icon: Icon, label, onClick, isActive, badge }: MenuItemProps) => (
  <button
    onClick={onClick}
    className={`flex items-center text-gray-600 hover:text-gray-900 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-100 ${
      isActive ? 'bg-gray-100 text-gray-900' : ''
    }`}
  >
    <Icon className="w-5 h-5 mr-3" />
    <span>{label}</span>
    {badge && (
      <span className="ml-auto bg-gray-200 text-xs rounded-full px-2 py-0.5">{badge}</span>
    )}
  </button>
);

const Sidebar = ({ user, closeMobileMenu }: SidebarProps) => {
  const [, navigate] = useLocation();
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);
  const [location] = useLocation();

  // Navigation helper
  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu();
  };

  // Check if any admin console page is active
  const isOnAdminPage = location.startsWith('/admin/');
  
  // If we're on admin page, ensure the admin console is open
  if (isOnAdminPage && !isAdminConsoleOpen) {
    setIsAdminConsoleOpen(true);
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("firebaseToken");
    sessionStorage.setItem("skipAutoLogin", "true");
    window.location.href = "/auth";
  };

  // Main menu items
  const mainMenuItems = [
    { icon: Home, label: "Home", onClick: () => navigateTo('/social'), isActive: location === '/social' },
    { icon: Award, label: "Recognize & Reward", onClick: () => navigateTo('/recognize'), isActive: location === '/recognize' },
    { icon: CircleDollarSign, label: "Reward Budgets", onClick: () => navigateTo('/budgets'), isActive: location === '/budgets' },
    { icon: BarChart2, label: "Leaderboard", onClick: () => navigateTo('/leaderboard'), isActive: location === '/leaderboard' },
    { icon: FileText, label: "Surveys", onClick: () => navigateTo('/user/surveys'), isActive: location === '/user/surveys' },
    { icon: Users, label: "Groups", onClick: () => navigateTo('/groups'), isActive: location === '/groups' },
  ];

  // Admin console menu items (only shown to admins)
  const adminConsoleItems = [
    { 
      icon: Shield, 
      label: "Admin Dashboard", 
      onClick: () => navigateTo('/admin/dashboard'),
      isActive: location === '/admin/dashboard',
    },
    { 
      icon: Users, 
      label: "Employee Management", 
      onClick: () => navigateTo('/admin/employees'),
      isActive: location === '/admin/employees',
      className: "whitespace-nowrap",
    },
    { 
      icon: Palette, 
      label: "Brand Identity", 
      onClick: () => navigateTo('/admin/branding'),
      isActive: location === '/admin/branding',
    },
    { 
      icon: Store, 
      label: "Shop Configuration", 
      onClick: () => navigateTo('/admin/shop/config'),
      isActive: location === '/admin/shop/config',
    },
    { 
      icon: ClipboardList, 
      label: "Surveys", 
      onClick: () => navigateTo('/admin/surveys'),
      isActive: location === '/admin/surveys',
    }
  ];

  return (
    <aside className="bg-white text-gray-800 w-64 p-4 h-full overflow-y-auto border-r border-gray-200">
      {/* Logo/Brand area */}
      <div className="flex items-center mb-6 pl-2">
        <div className="text-teal-500 mr-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H9.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9H15.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="font-bold text-xl">ThrivioHR</h1>
      </div>

      {/* User profile summary */}
      <div className="flex items-center mb-6 bg-gray-50 p-3 rounded-lg">
        <div className="flex-shrink-0 bg-gray-200 rounded-full h-10 w-10 flex items-center justify-center text-gray-700 font-medium">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div className="ml-3">
          <p className="text-gray-800 font-medium">{user?.name || 'Admin User'}</p>
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

        {/* Admin Console Section - Only visible to admins */}
        {user?.isAdmin && (
          <div className="space-y-2 border-t border-gray-200 pt-4 mt-4">
            <button
              onClick={() => setIsAdminConsoleOpen(!isAdminConsoleOpen)}
              className="flex items-center justify-between text-gray-600 hover:text-gray-900 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-100"
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3" />
                <span>Admin Console</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isAdminConsoleOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isAdminConsoleOpen && (
              <div className="ml-6 space-y-1 py-1">
                {/* Admin Console Sub-menu Items */}
                {adminConsoleItems.map((item, index) => (
                  <MenuItem
                    key={index}
                    icon={item.icon}
                    label={item.label}
                    onClick={item.onClick}
                    isActive={item.isActive}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Open buttons section */}
        <div className="space-y-2 mt-4">
          {/* Reward Shop Button - Highlighted */}
          <button
            onClick={() => navigateTo('/shop')}
            className="flex items-center justify-center w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span>Open Reward Shop</span>
          </button>
          
          {/* Social Platform Button */}
          <button
            onClick={() => navigateTo('/social')}
            className="flex items-center justify-center w-full py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-md transition-colors"
          >
            <Users className="w-5 h-5 mr-2" />
            <span>Open Social Platform</span>
          </button>
        </div>
      </div>

      {/* Groups section */}
      <div className="mt-8">
        <h3 className="text-xs uppercase text-gray-500 font-semibold tracking-wider mb-2 px-3">GROUPS</h3>
        <button className="flex items-center text-gray-600 hover:text-gray-900 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-100">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">OT</div>
          <span>Outdoor Together</span>
          <span className="ml-auto bg-gray-200 text-xs rounded-full px-2 py-0.5">8</span>
        </button>
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