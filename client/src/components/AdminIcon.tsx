import { Badge } from '@/components/ui/badge';
import { Users, Building, MapPin, Crown } from 'lucide-react';

interface AdminIconProps {
  adminScope: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const AdminIcon = ({
  adminScope,
  size = 'md',
  showLabel = true,
}: AdminIconProps) => {
  const getScopeIcon = (scope: string) => {
    const iconSize =
      size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

    switch (scope) {
      case 'super':
        return <Crown className={iconSize} />;
      case 'site':
        return <Building className={iconSize} />;
      case 'department':
        return <Users className={iconSize} />;
      case 'hybrid':
        return <MapPin className={iconSize} />;
      default:
        return null;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'super':
        return 'bg-red-100 text-red-800';
      case 'site':
        return 'bg-blue-100 text-blue-800';
      case 'department':
        return 'bg-green-100 text-green-800';
      case 'hybrid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'super':
        return 'Super Admin';
      case 'site':
        return 'Site Admin';
      case 'department':
        return 'Dept Admin';
      case 'hybrid':
        return 'Hybrid Admin';
      default:
        return 'User';
    }
  };

  if (adminScope === 'none' || !adminScope) {
    return null;
  }

  return (
    <Badge
      className={`${getScopeColor(adminScope)} ${size === 'sm' ? 'text-xs px-1' : ''}`}
    >
      <div className="flex items-center gap-1">
        {getScopeIcon(adminScope)}
        {showLabel && <span>{getScopeLabel(adminScope)}</span>}
      </div>
    </Badge>
  );
};

export default AdminIcon;
