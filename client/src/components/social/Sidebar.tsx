import React from 'react';
import { ShoppingCart, Shield } from 'react-feather'; // Assuming these icons are imported

const Sidebar = ({ user, closeMobileMenu }) => {
  const navigateToShop = () => {
    window.location.href = '/social/shop';
    closeMobileMenu();
  };

  const navigateToAdmin = () => {
    window.location.href = '/social/admin';
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
        <button
          onClick={navigateToAdmin}
          className="flex items-center text-gray-300 hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors w-full bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
        >
          <Shield className="w-5 h-5 mr-3" />
          <span>Admin Panel</span>
        </button>
      )}
      {/* ... rest of sidebar content ... */}
    </aside>
  );
};

export default Sidebar;