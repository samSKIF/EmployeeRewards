import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Sparkles, X, Check } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Component for interest items in the categorized list
const InterestItem = ({ 
  icon, 
  label, 
  category, 
  onAdd,
  availableInterests
}: { 
  icon: string; 
  label: string; 
  category: string; 
  onAdd: (interest: any) => void;
  availableInterests: Interest[];
}) => {
  // Find the actual interest ID from the available interests list
  const actualInterest = availableInterests.find(interest => 
    interest.label === label && interest.category === category
  );

  return (
    <div
      className="flex items-center justify-between p-2 hover:bg-primary/5 rounded-md cursor-pointer transition-colors"
      onClick={() => {
        if (actualInterest) {
          // Use the actual interest from the database
          onAdd(actualInterest);
        } else {
          // For hardcoded interests not in database, create as custom
          onAdd({ 
            id: -Date.now(), // Negative ID for custom interests
            label,
            category,
            icon,
            isPrimary: false,
            visibility: 'EVERYONE'
          });
        }
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
};

// Simple interest tag component for displaying interests
const InterestTag = ({ interest, onRemove, isPrimary, onTogglePrimary, onVisibilityChange }: { 
  interest: Interest, 
  onRemove?: () => void, 
  isPrimary?: boolean,
  onTogglePrimary?: () => void,
  onVisibilityChange?: (visibility: 'EVERYONE' | 'TEAM' | 'PRIVATE') => void
}) => {
  const { t } = useTranslation();
  const visibilityOptions = [
    { value: 'EVERYONE', label: t('interests.visibility.everyone', 'Everyone') },
    { value: 'TEAM', label: t('interests.visibility.team', 'My Team') },
    { value: 'PRIVATE', label: t('interests.visibility.private', 'Only Me') }
  ];

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-md mb-2 bg-white hover:bg-gray-50 transition-colors">
      <div 
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ${isPrimary ? 'bg-primary/90 text-white shadow-sm' : 'bg-gray-100 text-gray-800'}`}
      >
        {interest.icon && <span className="text-lg mr-1">{interest.icon}</span>}
        <span className="font-medium">{interest.customLabel || interest.label}</span>
      </div>

      {onVisibilityChange && (
        <Select 
          value={interest.visibility} 
          onValueChange={(value) => onVisibilityChange(value as 'EVERYONE' | 'TEAM' | 'PRIVATE')}
        >
          <SelectTrigger className="h-8 w-28 text-xs border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibilityOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="ml-auto flex items-center gap-2">
        {onTogglePrimary && (
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-8 w-8 p-0 rounded-full ${isPrimary ? 'bg-yellow-100 text-yellow-600' : 'text-gray-400 hover:bg-gray-100'}`}
            onClick={onTogglePrimary}
            title={t('interests.markAsPrimary', 'Mark as primary interest')}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}

        {onRemove && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

type Interest = {
  id: number;
  label: string;
  category: string;
  icon?: string;
  customLabel?: string;
  isPrimary: boolean;
  visibility: 'EVERYONE' | 'TEAM' | 'PRIVATE';
  memberCount?: number;
};

type InterestsSectionProps = {
  userId: number;
  isCurrentUser: boolean;
};

const InterestsSection: React.FC<InterestsSectionProps> = ({ userId, isCurrentUser }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [availableInterests, setAvailableInterests] = useState<Interest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Interest[]>([]);
  const [editableInterests, setEditableInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('Sport & Fitness');

  // Fetch user interests and available interests
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch both user interests and available interests in parallel
        const [userInterestsResponse, availableInterestsResponse] = await Promise.all([
          apiRequest('GET', `/api/employees/${userId}/interests`),
          apiRequest('GET', '/api/interests')
        ]);

        // Process user interests
        if (userInterestsResponse.ok) {
          const userInterestsData = await userInterestsResponse.json();
          console.log('Fetched user interests:', userInterestsData);
          setInterests(Array.isArray(userInterestsData) ? userInterestsData : []);
        }

        // Process available interests
        if (availableInterestsResponse.ok) {
          const availableInterestsData = await availableInterestsResponse.json();
          console.log('Fetched available interests:', availableInterestsData);
          setAvailableInterests(Array.isArray(availableInterestsData) ? availableInterestsData : []);
        }

      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Only show error toast if it's a real error, not just empty data
        if (error instanceof Error && !error.message.includes('404')) {
          toast({
            title: t('interests.fetchError', 'Error Loading Interests'),
            description: t('interests.fetchErrorDescription', 'Could not load interests. Please try again later.'),
            variant: 'destructive',
          });
        }
        // Set empty arrays on error
        setInterests([]);
        setAvailableInterests([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId, toast, t]);

  // Handle interest search
  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await apiRequest('GET', `/api/interests?query=${encodeURIComponent(value)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Failed to search interests:', error);
    }
  };

  // Open edit modal
  const handleEditClick = () => {
    setEditableInterests([...interests]);
    setIsModalOpen(true);
  };

  // Add interest
  const handleAddInterest = (interest: Interest) => {
    // Check if interest already exists
    const exists = editableInterests.some(item => 
      (item.id === interest.id) || 
      (item.label === interest.label && item.category === interest.category)
    );

    if (exists) {
      toast({
        title: t('interests.alreadyAdded', 'Already added'),
        description: t('interests.alreadyAddedDescription', 'This interest is already in your list.'),
      });
      return;
    }

    // Add the interest to editable list
    setEditableInterests([...editableInterests, { 
      ...interest, 
      isPrimary: false, 
      visibility: 'EVERYONE' 
    }]);

    toast({
      title: t('interests.addedSuccess', 'Interest added'),
      description: `${interest.label} ${t('interests.addedSuccessDescription', 'has been added to your interests.')}`,
    });
  };

  // Add custom interest
  const handleAddCustomInterest = () => {
    if (!searchTerm.trim()) return;

    // Create a new custom interest
    const customInterest: Interest = {
      id: -Date.now(), // Temporary negative ID to identify custom interests
      label: searchTerm,
      customLabel: searchTerm,
      category: activeCategory,
      isPrimary: false,
      visibility: 'EVERYONE'
    };

    setEditableInterests([...editableInterests, customInterest]);
    setSearchTerm('');
    setSearchResults([]);

    toast({
      title: t('interests.customAddedSuccess', 'Custom interest added'),
      description: `${searchTerm} ${t('interests.addedSuccessDescription', 'has been added to your interests.')}`,
    });
  };

  // Remove interest
  const handleRemoveInterest = (interestId: number) => {
    setEditableInterests(editableInterests.filter(interest => interest.id !== interestId));
  };

  // Toggle primary flag
  const handleTogglePrimary = (interestId: number) => {
    setEditableInterests(
      editableInterests.map(interest => {
        if (interest.id === interestId) {
          return { ...interest, isPrimary: !interest.isPrimary };
        }
        return interest;
      })
    );
  };

  // Update visibility
  const handleVisibilityChange = (interestId: number, visibility: 'EVERYONE' | 'TEAM' | 'PRIVATE') => {
    setEditableInterests(
      editableInterests.map(interest => {
        if (interest.id === interestId) {
          return { ...interest, visibility };
        }
        return interest;
      })
    );
  };

  // Save interests
  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Fix for empty interests - send empty array instead of nothing
      if (editableInterests.length === 0) {
        const response = await apiRequest('POST', `/api/employees/${userId}/interests`, []);
        if (response.ok) {
          setInterests([]);
          setIsModalOpen(false);
          toast({
            title: t('interests.saveSuccess', 'Interests saved'),
            description: t('interests.saveSuccessDescription', 'Your interests have been updated successfully.'),
          });
        }
        return;
      }

      // Format the interests to match what the server expects
      // Server expects an array of interests with interestId field
      const formattedData = editableInterests.map(interest => {
        // For custom interests (negative IDs), handle differently
        const isCustom = interest.id < 0;

        return {
          // Server expects interestId, not id
          interestId: isCustom ? undefined : interest.id,
          // For custom interests, use the label as customLabel
          customLabel: isCustom ? interest.label : interest.customLabel,
          // Make sure these are properly formatted
          isPrimary: Boolean(interest.isPrimary),
          visibility: interest.visibility || 'EVERYONE'
        };
      });

      console.log('Saving interests:', formattedData);

      const response = await apiRequest('POST', `/api/employees/${userId}/interests`, formattedData);

      console.log('Save response status:', response.status);
      console.log('Save response ok:', response.ok);

      if (response.ok) {
        try {
          const updatedInterests = await response.json();
          console.log('Updated interests from server:', updatedInterests);
          setInterests(Array.isArray(updatedInterests) ? updatedInterests : []);
          setIsModalOpen(false);
          toast({
            title: t('interests.saveSuccess', 'Interests saved'),
            description: t('interests.saveSuccessDescription', 'Your interests have been updated successfully.'),
          });
        } catch (parseError) {
          console.error('Error parsing response JSON:', parseError);
          // Still consider it a success if the status was OK
          setInterests(editableInterests);
          setIsModalOpen(false);
          toast({
            title: t('interests.saveSuccess', 'Interests saved'),
            description: t('interests.saveSuccessDescription', 'Your interests have been updated successfully.'),
          });
        }
      } else {
        console.error('Server response not OK:', response.status, response.statusText);
        const errorData = await response.json().catch(() => null);
        console.error('Error data:', errorData);
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save interests:', error);
      toast({
        title: t('interests.saveError', 'Error saving interests'),
        description: t('interests.saveErrorDescription', 'Could not save your interests. Please try again later.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render visible interests based on current view state
  const visibleInterests = isExpanded ? interests : interests.slice(0, 5);
  const hasMoreInterests = interests.length > 5;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle>
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {t('interests.title', 'Interests')}
          </span>
        </CardTitle>
        {isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleEditClick}
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">{t('interests.edit', 'Edit')}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && !isModalOpen ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-teal-500 rounded-full border-t-transparent"></div>
          </div>
        ) : (interests.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {visibleInterests.map(interest => (
                <Badge 
                  key={interest.id} 
                  variant="outline" 
                  className={`${interest.isPrimary ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50'} hover:bg-gray-100 flex items-center gap-1`}
                  title={interest.customLabel || interest.label}
                >
                  {interest.icon && <span className="text-sm">{interest.icon}</span>}
                  <span>{interest.customLabel || interest.label}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({interest.memberCount || 0})
                  </span>
                </Badge>
              ))}
            </div>
            {hasMoreInterests && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-500" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? t('interests.showLess', 'Show less') : t('interests.showMore', { defaultValue: 'Show {{count}} more', count: interests.length - 5 })}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            {isCurrentUser ? t('interests.emptyCurrentUser', 'You haven\'t added any interests yet.') : t('interests.emptyOtherUser', 'This user hasn\'t added any interests yet.')}
          </div>
        ))}
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('interests.editTitle', 'Edit Your Interests')}
            </DialogTitle>
          </DialogHeader>

          {/* Your Current Interests Section */}
          {interests.length > 0 && (
            <div className="my-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <span>{t('interests.yourCurrentInterests', 'Your Current Interests')}</span>
                <span className="text-xs text-gray-500">({interests.length})</span>
              </h4>
              <div className="space-y-2">
                {interests.map((interest) => (
                  <InterestTag
                    key={interest.id}
                    interest={interest}
                    isPrimary={interest.isPrimary}
                    onRemove={() => handleRemoveInterest(interest.id)}
                    onTogglePrimary={() => handleTogglePrimary(interest.id)}
                    onVisibilityChange={(visibility) => handleVisibilityChange(interest.id, visibility)}
                  />
                ))}
              </div>
              <div className="border-t mt-4 pt-4"></div>
            </div>
          )}

          {/* Search input */}
          <div className="space-y-4 my-4">
            <div className="relative">
              <Input
                placeholder={t('interests.searchPlaceholder', 'Search interests or add your own...')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-md border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className={`absolute w-full mt-1 max-h-80 overflow-auto rounded-md border bg-white shadow-lg z-10 ${!searchTerm && 'mb-4'}`}>
                {searchTerm.length >= 2 ? (
                  searchResults.length > 0 ? (
                    <div className="p-2">
                      {searchResults.map(result => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-2 hover:bg-primary/5 rounded-md cursor-pointer transition-colors"
                          onClick={() => handleAddInterest(result)}
                        >
                          <div className="flex items-center">
                            {result.icon && <span className="mr-2 text-lg">{result.icon}</span>}
                            <span className="font-medium">{result.label}</span>
                          </div>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{result.category}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-500 mb-2">{t('interests.noResults', 'No results found')}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-1 text-primary border-primary/20 hover:bg-primary/5" 
                        onClick={handleAddCustomInterest}
                      >
                        {t('interests.addCustom', { defaultValue: 'Add "{{term}}" as custom interest', term: searchTerm })}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="p-1">
                    <div className="flex justify-between items-center border-b pb-2 mb-2">
                      <h4 className="text-sm font-medium px-2 text-gray-700">{t('interests.editTitle', 'Edit Your Interests')}</h4>
                      <div className="flex px-2 bg-gray-50 rounded-md p-1 overflow-x-auto">
                        {Array.from(new Set(availableInterests.map(interest => interest.category))).map((category) => {
                          const categoryIcons = {
                            'Sport & Fitness': '🏃',
                            'Arts & Creativity': '🎨',
                            'Technology & Gaming': '💻',
                            'Food & Drinks': '🍳',
                            'Lifestyle & Wellness': '🧘‍♂️',
                            'Entertainment & Pop Culture': '🎬',
                            'Social Impact & Learning': '🌍'
                          };

                          return (
                            <Button 
                              key={category}
                              variant="ghost"
                              size="sm"
                              className={`rounded-full w-8 h-8 p-0 flex-shrink-0 ${activeCategory === category ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                              onClick={() => setActiveCategory(category)}
                              title={category}
                            >
                              {categoryIcons[category as keyof typeof categoryIcons] || '⭐'}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <h4 className="text-sm font-medium px-2 py-2 text-gray-700 border-b mb-2">{activeCategory}</h4>

                    <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-md">
                      {availableInterests
                        .filter(interest => interest.category === activeCategory)
                        .map(interest => (
                          <div
                            key={interest.id}
                            className="flex items-center justify-between p-2 hover:bg-primary/5 rounded-md cursor-pointer transition-colors"
                            onClick={() => handleAddInterest(interest)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{interest.icon || '⭐'}</span>
                              <span className="text-sm font-medium">{interest.label}</span>
                              <span className="text-xs text-gray-500">({interest.memberCount || 0})</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected interests */}
          <div className="mt-6 mb-4">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2 border-b pb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('interests.selectedInterests', 'Selected Interests')}
            </h4>
            <div className="max-h-60 overflow-y-auto pr-1">
              {editableInterests.length > 0 ? (
                editableInterests.map(interest => (
                  <InterestTag
                    key={interest.id}
                    interest={interest}
                    isPrimary={interest.isPrimary}
                    onRemove={() => handleRemoveInterest(interest.id)}
                    onTogglePrimary={() => handleTogglePrimary(interest.id)}
                    onVisibilityChange={(visibility) => handleVisibilityChange(interest.id, visibility)}
                  />
                ))
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <div className="text-gray-500 flex flex-col items-center">
                    <Sparkles className="h-8 w-8 text-gray-300 mb-2" />
                    {t('interests.noInterestsSelected', 'No interests selected yet. Browse or search above to add interests.')}
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-3 bg-yellow-50 p-2 rounded-md border border-yellow-100 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p>{t('interests.markPrimaryTip', 'Tip: Mark up to 3 interests as primary (star icon) to highlight them on your profile.')}</p>
            </div>
          </div>

          <DialogFooter className="pt-3 mt-2 border-t flex justify-between">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button disabled={isLoading} onClick={handleSave} className="gap-2">
              {isLoading ? (
                <>
                  <span>{t('common.saving', 'Saving...')}</span>
                  <div className="animate-spin h-4 w-4 border-2 border-current rounded-full border-t-transparent"></div>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t('common.save', 'Save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InterestsSection;