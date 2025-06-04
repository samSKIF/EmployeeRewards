import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Heart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Interest {
  id: number;
  name: string;
  category: string;
}

interface SimpleInterestsSectionProps {
  interests: Interest[];
  isEditing: boolean;
  onInterestsChange: (interests: Interest[]) => void;
}

interface InterestStats {
  memberCount: number;
  groupId?: number;
  isMember: boolean;
}

const INTEREST_CATEGORIES = {
  'Technology': ['Programming', 'AI', 'Cybersecurity', 'Data Science', 'Cloud Computing'],
  'Sports': ['Football', 'Basketball', 'Tennis', 'Swimming', 'Running'],
  'Arts': ['Photography', 'Painting', 'Music', 'Writing', 'Design'],
  'Hobbies': ['Cooking', 'Gardening', 'Reading', 'Gaming', 'Travel'],
  'Wellness': ['Yoga', 'Meditation', 'Fitness', 'Nutrition', 'Mental Health']
};

export function SimpleInterestsSection({ interests, isEditing, onInterestsChange }: SimpleInterestsSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Technology']);

  // Fetch interest statistics
  const { data: interestStats } = useQuery({
    queryKey: ['/api/interests/stats'],
    enabled: !isEditing
  });

  const getInterestStats = (interestName: string): InterestStats => {
    if (!interestStats) return { memberCount: 0, isMember: false };
    return interestStats[interestName] || { memberCount: 0, isMember: false };
  };

  const joinInterestGroup = async (interestName: string) => {
    try {
      const response = await fetch(`/api/interests/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestName })
      });
      
      if (response.ok) {
        // Refresh stats
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const groupedInterests = interests.reduce((acc, interest) => {
    const category = interest.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(interest);
    return acc;
  }, {} as Record<string, Interest[]>);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          Interests & Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(INTEREST_CATEGORIES).map(([category, categoryInterests]) => {
          const isExpanded = expandedCategories.includes(category);
          const userInterestsInCategory = groupedInterests[category] || [];
          
          return (
            <div key={category} className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto"
                onClick={() => toggleCategory(category)}
              >
                <span className="font-medium text-sm">{category}</span>
                <span className="text-xs text-muted-foreground">
                  {isExpanded ? '−' : '+'}
                </span>
              </Button>
              
              {isExpanded && (
                <div className="grid grid-cols-1 gap-2 pl-4">
                  {categoryInterests.map((interestName) => {
                    const hasInterest = userInterestsInCategory.some(ui => ui.name === interestName);
                    const stats = getInterestStats(interestName);
                    
                    return (
                      <div
                        key={interestName}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasInterest ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{interestName}</span>
                          {hasInterest && (
                            <Badge variant="secondary" className="text-xs">
                              Your Interest
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{stats.memberCount}</span>
                          </div>
                          
                          {hasInterest && !stats.isMember && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => joinInterestGroup(interestName)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Join Group
                            </Button>
                          )}
                          
                          {hasInterest && stats.isMember && (
                            <Badge variant="default" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Member
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {interests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No interests added yet</p>
            <p className="text-xs">Add interests to discover groups and connect with colleagues</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}