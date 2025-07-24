import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserStatusIcon from './UserStatusIcon';

interface UserAvatarProps {
  user: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    jobTitle?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showStatus = true,
  className = '',
}) => {
  // Define size classes based on the size prop
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  // Generate initials fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={`${sizeClasses[size]} ${className}`}>
        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>

      {/* Show status icons if requested */}
      {showStatus && (
        <div className="absolute -bottom-1 -right-1">
          <UserStatusIcon
            userId={user.id}
            size={size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'}
          />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
