import React from 'react';
import { ShoppingCart, Shield } from 'react-feather'; // Assuming these icons are imported
import { Users, ClipboardList, Store } from 'react-feather'; // Added imports for missing icons


const Sidebar = ({ user, closeMobileMenu }) => {
  const navigateToShop = () => {
    window.location.href = '/social/shop';
    closeMobileMenu();
  };

  const navigateToAdmin = () => {
    window.location.href = '/admin';
    closeMobileMenu();
  };

  const navigateToEmployees = () => {
    window.location.href = '/admin/employees';
    closeMobileMenu();
  };

  const navigateToSurveys = () => {
    window.location.href = '/admin/surveys';
    closeMobileMenu();
  };

  const navigateToShopConfig = () => {
    window.location.href = '/shop-config';
    closeMobileMenu();
  };

  return (
    <aside className="bg-gray-800 text-white w-64">
      {/* ... other sidebar content ... */}
      <button
        onClick={navigateToShop}
        className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
      >
        <ShoppingCart className="w-5 h-5 mr-3" />
        <span>Reward Shop</span>
      </button>

      {user?.isAdmin && (
        <div className="space-y-2 border-t border-gray-700 pt-2 mt-2">
          <button
            onClick={navigateToAdmin}
            className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
          >
            <Shield className="w-5 h-5 mr-3" />
            <span>Admin Dashboard</span>
          </button>

          <button
            onClick={navigateToEmployees}
            className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full"
          >
            <Users className="w-5 h-5 mr-3" />
            <span>Employee Management</span>
          </button>

          <button
            onClick={navigateToSurveys}
            className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full"
          >
            <ClipboardList className="w-5 h-5 mr-3" />
            <span>Surveys</span>
          </button>

          <button
            onClick={navigateToShopConfig}
            className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full"
          >
            <Store className="w-5 h-5 mr-3" />
            <span>Shop Configuration</span>
          </button>
        </div>
      )}
      {/* ... rest of sidebar content ... */}
    </aside>
  );
};

export default Sidebar;