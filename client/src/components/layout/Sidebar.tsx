import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import {
  Home,
  ShoppingCart,
  RefreshCcw,
  Shield,
  Store,
  LogOut,
  Menu,
  Award,
  MessageSquare,
  Settings,
  Users,
  ClipboardList,
  FileText,
  Calendar,
} from 'lucide-react';
import { useMobile } from '@/hooks/use-mobile';
// Firebase authentication removed - using custom auth
import { useToast } from '@/hooks/use-toast';

const Sidebar = () => {
  const { user } = useAuth();
  const { signOut: firebaseSignOut } = useFirebaseAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user balance
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ['/api/points/balance'],
    enabled: !!user,
  });

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMobileMenu = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Function to open social platform in a new tab
  const openSocialPlatform = () => {
    window.open('/social', '_blank');
    closeMobileMenu();
  };

  const openRewardShop = () => {
    window.open('/shop', '_blank');
    closeMobileMenu();
  };

  // Direct logout handler with Firebase integration
  const handleLogout = async () => {
    try {
      console.log('Sidebar: Starting logout process');

      // Remove Firebase token
      localStorage.removeItem('firebaseToken');

      // Set sessionStorage to prevent auto-login on auth page
      sessionStorage.setItem('skipAutoLogin', 'true');

      // Sign out from Firebase
      await firebaseSignOut();

      console.log('Sidebar: Logout completed successfully');

      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });

      // Redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sidebar logout failed:', error);
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: 'There was a problem logging out. Please try again.',
      });
    }
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5 mr-3" />,
    },
    {
      path: '/shop-config',
      label: 'Configure Shop',
      icon: <ShoppingCart className="w-5 h-5 mr-3" />,
    },
    {
      path: '/transactions',
      label: 'Transactions',
      icon: <RefreshCcw className="w-5 h-5 mr-3" />,
    },
    {
      path: '/leave-request',
      label: 'Leave Request',
      icon: <FileText className="w-5 h-5 mr-3" />,
    },
    {
      path: '/admin/surveys',
      label: 'Surveys',
      icon: <ClipboardList className="w-5 h-5 mr-3" />,
    },
    {
      path: '/admin/surveys/templates',
      label: 'Survey Templates',
      icon: <FileText className="w-5 h-5 mr-3" />,
    },
  ];

  // Add admin and seller links for admin users
  if (user?.isAdmin) {
    navItems.push(
      {
        path: '/admin',
        label: 'Admin',
        icon: <Shield className="w-5 h-5 mr-3" />,
      },

      {
        path: '/seller',
        label: 'Seller Center',
        icon: <Store className="w-5 h-5 mr-3" />,
      }
    );
  }

  const sidebarClasses = `bg-gray-800 text-white w-full md:w-64 md:min-h-screen md:fixed md:h-screen overflow-y-auto transition-all ${
    isMobile && !isOpen ? 'hidden' : 'block'
  }`;

  return (
    <aside className={sidebarClasses}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Award className="text-amber-500 h-6 w-6" />
          <h1 className="text-xl font-bold">RewardHub</h1>
        </div>
        {isMobile && (
          <button
            className="text-gray-300 hover:text-white"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        {user && (
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.department || ''}</p>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-300">Available Points</p>
                <span className="text-lg font-bold text-white">
                  {balanceData?.balance || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        <nav>
          <ul>
            {navItems.map((item) => (
              <li className="mb-1" key={item.path}>
                <Link
                  href={item.path}
                  onClick={closeMobileMenu}
                  className={`flex items-center ${
                    location === item.path
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } rounded-md px-3 py-2 text-sm font-medium transition-colors`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-gray-700 space-y-2">
        <button
          onClick={openSocialPlatform}
          className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-green-600 to-teal-500 hover:from-green-700 hover:to-teal-600"
        >
          <MessageSquare className="w-5 h-5 mr-3" />
          <span>Open Social Platform</span>
        </button>

        <button
          onClick={openRewardShop}
          className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
        >
          <ShoppingCart className="w-5 h-5 mr-3" />
          <span>Open Reward Shop</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
