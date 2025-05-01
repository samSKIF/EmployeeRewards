
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from '@/components/social';
import { Menu, X, Home, Store, Users, Award, ListChecks, MoreHorizontal, Search } from 'lucide-react';
import { useFirebaseAuth } from '@/context/FirebaseAuthContext';
import { useQuery } from '@tanstack/react-query';

interface SocialLayoutProps {
  children: React.ReactNode;
}

const SocialLayout: React.FC<SocialLayoutProps> = ({ children }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-8">
            <img src="/logo.png" alt="Logo" className="h-8" />
            <nav className="hidden md:flex items-center space-x-1">
              <a href="/social" className="px-3 py-2 text-sm font-medium text-blue-600">Home</a>
              <a href="/store" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Store</a>
              <a href="/spaces" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Spaces</a>
              <a href="/awards" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Awards</a>
              <a href="/milestones" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Milestones</a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <button className="md:hidden" onClick={toggleMobileMenu}>
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar - Points/Balance */}
        <aside className="w-72 fixed left-0 top-16 bottom-0 bg-white border-r p-4 overflow-y-auto hidden lg:block">
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Motivosity Bucks</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Giving</span>
                  <span className="font-semibold">$4</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Personal</span>
                  <span className="font-semibold">$31</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72 lg:mr-72 px-4 py-6">
          {children}
        </main>

        {/* Right Sidebar - Action Items */}
        <aside className="w-72 fixed right-0 top-16 bottom-0 bg-white border-l p-4 overflow-y-auto hidden lg:block">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Action Items</h3>
              <div className="space-y-4">
                {/* Action items will go here */}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SocialLayout;
