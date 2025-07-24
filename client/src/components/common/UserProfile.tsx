import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MapPin, Briefcase, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import UserAvatar from './UserAvatar';

interface UserProfileProps {
  user: {
    id: number;
    name: string;
    email?: string;
    jobTitle?: string | null;
    department?: string | null;
    location?: string | null;
    avatarUrl?: string | null;
    hireDate?: string | Date | null;
    dateJoined?: string | Date | null;
  };
  editable?: boolean;
  onEditClick?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  user,
  editable = false,
  onEditClick,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative">
        {editable && (
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 bg-white"
            onClick={onEditClick}
          >
            <Edit className="h-4 w-4 mr-1" />
            {t('profile.edit', 'Edit')}
          </Button>
        )}
      </div>

      <CardHeader className="p-0 relative">
        <div className="flex justify-center -mt-12 mb-4">
          <UserAvatar
            user={{
              ...user,
              dateJoined: user.hireDate || user.dateJoined,
            }}
            size="xl"
            showStatus={true}
            className="border-4 border-white shadow-md"
          />
        </div>

        <div className="text-center px-6">
          <h2 className="text-2xl font-bold">{user.name}</h2>

          {user.jobTitle && (
            <div className="flex items-center justify-center mt-1 text-gray-600">
              <Briefcase className="h-4 w-4 mr-1" />
              <span>{user.jobTitle}</span>
            </div>
          )}

          {user.department && (
            <Badge variant="outline" className="mt-2">
              {user.department}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="space-y-3">
          {user.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              <span>{user.email}</span>
            </div>
          )}

          {user.location && (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              <span>{user.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
