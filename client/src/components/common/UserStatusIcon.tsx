import React, { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { useTranslation } from 'react-i18next';
import * as LucideIcons from 'lucide-react';

// Define our status type
export type UserStatus = {
  id: number;
  statusType: {
    id: number;
    name: string;
    iconName: string;
    color: string;
  };
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
};

type UserStatusIconProps = {
  userId: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const UserStatusIcon: React.FC<UserStatusIconProps> = ({
  userId,
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Size mapping
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  useEffect(() => {
    const fetchUserStatuses = async () => {
      setLoading(true);
      try {
        const response = await apiRequest(
          'GET',
          `/api/employee-status/users/${userId}/statuses`
        );
        if (response.ok) {
          const data = await response.json();
          setStatuses(data);
        } else {
          setError('Failed to fetch user statuses');
        }
      } catch (err) {
        console.error('Error fetching user statuses:', err);
        setError('Error fetching user statuses');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserStatuses();
    }
  }, [userId]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error || !statuses.length) {
    return null; // Don't show anything if there's an error or no statuses
  }

  const getStatusIcon = (iconName: string) => {
    const iconMap: Record<string, string> = {
      Cake: '🍰',
      PalmTree: '🌴',
      Home: '🏠',
      GraduationCap: '🎓',
      Stethoscope: '🩺',
      Calendar: '📅',
    };
    return iconMap[iconName] || '📍';
  };

  return (
    <div className={`flex -space-x-1 ${className}`}>
      {statuses.map((status) => {
        return (
          <TooltipProvider key={status.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`rounded-full flex items-center justify-center p-1 text-white font-medium`}
                  style={{ backgroundColor: status.statusType.color }}
                >
                  <span className={sizeClasses[size]}>
                    {getStatusIcon(status.statusType.iconName)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{status.statusType.name}</p>
                {status.notes && (
                  <p className="text-xs opacity-80">{status.notes}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
};

export default UserStatusIcon;
