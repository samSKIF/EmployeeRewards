import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { TopNavbar } from '@/components/social';
import { Sidebar } from '@/components/social';

interface SocialLayoutProps {
  children: React.ReactNode;
}

const SocialLayout: React.FC<SocialLayoutProps> = ({ children }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { user } = useAuth();

  console.log('SocialLayout - user from useAuth:', user);
  console.log('SocialLayout - user?.isAdmin:', user?.isAdmin);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <TopNavbar user={user} />

      {/* Mobile Sidebar - hidden by default, shown when toggled */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${showMobileMenu ? 'block' : 'hidden'}`}
        onClick={closeMobileMenu}
      ></div>

      <div
        className={`fixed md:hidden z-30 h-full transition-transform duration-300 ease-in-out transform ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar user={user} closeMobileMenu={closeMobileMenu} />
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Mobile header with menu button - only visible on mobile */}
        <div className="md:hidden flex items-center justify-between bg-white shadow-sm p-4 sticky top-0 z-10">
          <div className="flex items-center">
            <div className="bg-teal-500 text-white rounded-full p-1.5 mr-2">
              <svg
                width="16"
                height="16"
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
            <span className="font-bold text-gray-800">ThrivioHR</span>
          </div>
          <button
            onClick={toggleMobileMenu}
            className="text-gray-600 p-2 rounded-md hover:bg-gray-100 focus:outline-none"
          >
            {showMobileMenu ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Page content */}
        <main className="flex justify-center w-full py-6">
          <div className="w-full px-4 max-w-[1800px] 4xl:max-w-[1800px] 3xl:max-w-[1600px] 2xl:max-w-[1400px] xl:max-w-[1200px] lg:max-w-[1000px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SocialLayout;
