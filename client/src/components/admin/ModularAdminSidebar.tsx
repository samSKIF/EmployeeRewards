import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createAdminMenuConfig, type MenuSection, type MenuItem } from './AdminSidebarConfig';
import { useOrganizationFeatures } from '@/hooks/useOrganizationFeatures';

interface ModularAdminSidebarProps {
  user: {
    id?: number;
    isAdmin?: boolean;
    email?: string;
  } | null;
  closeMobileMenu?: () => void;
  className?: string;
}

interface CollapsedSections {
  [sectionId: string]: boolean;
}

const ModularAdminSidebar: React.FC<ModularAdminSidebarProps> = ({
  user,
  closeMobileMenu,
  className
}) => {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();
  const organizationFeatures = useOrganizationFeatures();
  
  // Track which sections are collapsed
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  // Only show admin sidebar for admin users
  if (!user?.isAdmin && user?.email !== 'admin@canva.com') {
    return null;
  }

  // Get menu configuration
  console.log('ModularAdminSidebar - organizationFeatures:', organizationFeatures);
  const menuConfig = createAdminMenuConfig(location, organizationFeatures);
  console.log('ModularAdminSidebar - menuConfig sections:', menuConfig.sections.map(s => ({ id: s.id, title: s.title })));

  // Navigation helper
  const navigateTo = (path: string) => {
    navigate(path);
    closeMobileMenu?.();
  };

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Check if section should be expanded
  const isSectionExpanded = (section: MenuSection): boolean => {
    // If user manually collapsed, respect that
    if (collapsedSections[section.id] !== undefined) {
      return !collapsedSections[section.id];
    }
    // Otherwise use default expansion state
    return section.isExpanded ?? false;
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {/* Admin Console Header */}
      <div className="px-3 py-2 border-b border-gray-200 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
          {t('admin.console', 'Admin Console')}
        </h3>
      </div>

      {/* Menu Sections */}
      {menuConfig.sections.map((section) => {
        const isExpanded = isSectionExpanded(section);
        
        return (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            <button
              onClick={() => section.isCollapsible && toggleSection(section.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-left",
                "text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50",
                "rounded-md transition-colors",
                section.isCollapsible && "cursor-pointer",
                !section.isCollapsible && "cursor-default"
              )}
            >
              <div className="flex items-center space-x-2">
                <section.icon className="w-4 h-4" />
                <span>{t(`admin.sections.${section.id}`, section.title)}</span>
              </div>
              
              {section.isCollapsible && (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              )}
            </button>

            {/* Section Items */}
            {(!section.isCollapsible || isExpanded) && (
              <div className="ml-6 space-y-1">
                {section.items.map((item) => (
                  <MenuItem
                    key={item.route}
                    item={item}
                    onClick={() => navigateTo(item.route)}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 px-3 py-2 bg-gray-50 rounded-md">
          <div className="text-xs text-gray-500">
            <div>Current Route: {location}</div>
            <div>Recognition Enabled: {organizationFeatures.find(f => f.featureKey === 'recognition')?.isEnabled ? 'Yes' : 'No'}</div>
            <div>Sections: {menuConfig.sections.length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Menu Item Component
interface MenuItemProps {
  item: MenuItem;
  onClick: () => void;
  t: (key: string, fallback?: string) => string;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, onClick, t }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 text-left",
        "text-sm rounded-md transition-colors group",
        item.isActive
          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      )}
      title={item.description}
    >
      <div className="flex items-center space-x-3">
        <item.icon className={cn(
          "w-4 h-4 flex-shrink-0",
          item.isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
        )} />
        <span className="truncate">
          {t(`admin.menu.${item.route.replace(/[^a-zA-Z0-9]/g, '_')}`, item.label)}
        </span>
      </div>

      {/* Badge */}
      {item.badge && (
        <span className={cn(
          "ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full",
          item.isActive
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        )}>
          {item.badge}
        </span>
      )}
    </button>
  );
};

export default ModularAdminSidebar;