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
  LucideIcon
} from 'lucide-react';

interface SidebarProps {
  user: {
    id?: number;
    username?: string;
    name?: string;
    isAdmin?: boolean;
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
    className={`flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-700 ${
      isActive ? 'bg-gray-700 text-white' : ''
    }`}
  >
    <Icon className="w-5 h-5 mr-3" />
    <span>{label}</span>
    {badge && (
      <span className="ml-auto bg-gray-700 text-xs rounded-full px-2 py-0.5">{badge}</span>
    )}
  </button>
);

const Sidebar = ({ user, closeMobileMenu }: SidebarProps) => {
  const [, navigate] = useLocation();
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState(false);

  // Navigation helper
  const navigateTo = (path: string) => {
    window.location.href = path;
    closeMobileMenu();
  };

  // Main menu items
  const mainMenuItems = [
    { icon: Home, label: "Home", onClick: () => navigateTo('/') },
    { icon: Award, label: "Recognize & Reward", onClick: () => navigateTo('/recognize') },
    { icon: CircleDollarSign, label: "Reward Budgets", onClick: () => navigateTo('/budgets') },
    { icon: BarChart2, label: "Leaderboard", onClick: () => navigateTo('/leaderboard') },
    { icon: ClipboardList, label: "Surveys", onClick: () => navigateTo('/surveys') },
    { icon: Users, label: "Groups", onClick: () => navigateTo('/groups') },
  ];

  // Admin console menu items (only shown to admins)
  const adminConsoleItems = [
    { 
      icon: Shield, 
      label: "Admin Dashboard", 
      onClick: () => navigateTo('/admin/dashboard'),
      description: "Data dashboard with point metrics"
    },
    { 
      icon: Users, 
      label: "Employee Management", 
      onClick: () => navigateTo('/admin/employees'),
      description: "Create and manage employee profiles"
    },
    { 
      icon: Palette, 
      label: "Brand Identity", 
      onClick: () => navigateTo('/admin/branding'),
      description: "Customize colors and design features"
    },
    { 
      icon: Store, 
      label: "Shop Configuration", 
      onClick: () => navigateTo('/admin/shop/config'),
      description: "Manage products and categories"
    },
    { 
      icon: ClipboardList, 
      label: "Surveys", 
      onClick: () => navigateTo('/admin/surveys'),
      description: "Create and manage surveys"
    }
  ];

  return (
    <aside className="bg-gray-800 text-white w-64 p-4 h-full overflow-y-auto fixed">
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
      <div className="flex items-center mb-6">
        <div className="flex-shrink-0 bg-teal-600 rounded-full h-10 w-10 flex items-center justify-center text-white font-medium">
          {user?.name?.charAt(0) || 'A'}
        </div>
        <div className="ml-3">
          <p className="text-white font-medium">{user?.name || 'Admin User'}</p>
          <p className="text-xs text-teal-400">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-400 mr-1"></span>
            Online
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
          />
        ))}

        {/* Reward Shop Button - Highlighted */}
        <button
          onClick={() => navigateTo('/shop')}
          className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 mt-2"
        >
          <ShoppingCart className="w-5 h-5 mr-3" />
          <span>Reward Shop</span>
        </button>

        {/* Admin Console Section - Only visible to admins */}
        {user?.isAdmin && (
          <div className="space-y-2 border-t border-gray-700 pt-4 mt-4">
            <button
              onClick={() => setIsAdminConsoleOpen(!isAdminConsoleOpen)}
              className="flex items-center justify-between text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full"
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3" />
                <span>Admin Console</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isAdminConsoleOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isAdminConsoleOpen && (
              <div className="ml-2 space-y-1 py-1">
                {/* Admin Console Sub-menu Items */}
                {adminConsoleItems.map((item, index) => (
                  <MenuItem
                    key={index}
                    icon={item.icon}
                    label={item.label}
                    onClick={item.onClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Groups section - Similar to the design you shared */}
      {user?.isAdmin && (
        <div className="mt-8">
          <h3 className="text-xs uppercase text-gray-400 font-semibold tracking-wider mb-2 px-3">GROUPS</h3>
          <button className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-gray-700">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">OT</div>
            <span>Outdoor Together</span>
            <span className="ml-auto bg-gray-700 text-xs rounded-full px-2 py-0.5">8</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;