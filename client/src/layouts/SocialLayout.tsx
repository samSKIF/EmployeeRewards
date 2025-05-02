import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useQuery } from '@tanstack/react-query';
import { TopNavbar } from '@/components/social';
import { Sidebar } from '@/components/social';

interface SocialLayoutProps {
  children: React.ReactNode;
}

const SocialLayout: React.FC<SocialLayoutProps> = ({ children }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Create a user object to pass to the navigation components
  const mockUser = {
    id: 1,
    name: 'Admin User',
    isAdmin: true,
    email: 'admin@demo.io'
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <TopNavbar user={mockUser} />
      
      {/* Mobile Sidebar - hidden by default, shown when toggled */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${showMobileMenu ? 'block' : 'hidden'}`} onClick={closeMobileMenu}></div>
      
      <div className={`fixed md:hidden z-30 h-full transition-transform duration-300 ease-in-out transform ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar user={mockUser} closeMobileMenu={closeMobileMenu} />
      </div>

      {/* Main content */}
      <div className="flex-1">
        {/* Mobile header with menu button */}
        <div className="md:hidden flex items-center justify-between bg-teal-500 p-4 sticky top-0 z-10">
          <div className="flex items-center text-white">
            <span className="font-bold text-xl">ThrivioHR</span>
          </div>
          <button 
            onClick={toggleMobileMenu}
            className="text-white p-2 rounded-md hover:bg-teal-600 focus:outline-none"
          >
            {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Page content */}
        <main className="p-0 container mx-auto px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SocialLayout;