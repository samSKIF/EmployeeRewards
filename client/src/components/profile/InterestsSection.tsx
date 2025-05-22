import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Sparkles, Check, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Visibility options
const VISIBILITY_OPTIONS = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'TEAM', label: 'My Team' },
  { value: 'PRIVATE', label: 'Only Me' }
];

type Interest = {
  id: number;
  label: string;
  category: string;
  icon?: string;
  customLabel?: string;
  isPrimary: boolean;
  visibility: 'EVERYONE' | 'TEAM' | 'PRIVATE';
};

type InterestsSectionProps = {
  userId: number;
  isCurrentUser: boolean;
};

const InterestsSection: React.FC<InterestsSectionProps> = ({ userId, isCurrentUser }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Interest[]>([]);
  const [popularInterests, setPopularInterests] = useState<Interest[]>([]);
  const [editableInterests, setEditableInterests] = useState<Interest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user interests
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', `/api/employees/${userId}/interests`);
        const data = await response.json();
        setInterests(data);
      } catch (error) {
        console.error('Failed to fetch interests:', error);
        toast({
          title: t('interests.fetchError'),
          description: t('interests.fetchErrorDescription'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterests();
  }, [userId, toast, t]);
  
  // Fetch popular interests
  useEffect(() => {
    const fetchPopularInterests = async () => {
      try {
        const response = await apiRequest('GET', `/api/interests?popular=true`);
        const data = await response.json();
        setPopularInterests(data);
      } catch (error) {
        console.error('Failed to fetch popular interests:', error);
      }
    };

    fetchPopularInterests();
  }, []);

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
    
    // Ensure the suggested interests dropdown is visible immediately
    if (popularInterests.length === 0) {
      const fetchPopularInterests = async () => {
        try {
          const response = await apiRequest('GET', `/api/interests?popular=true`);
          const data = await response.json();
          setPopularInterests(data);
        } catch (error) {
          console.error('Failed to fetch popular interests:', error);
        }
      };
      fetchPopularInterests();
    }
  };

  // Add interest
  const handleAddInterest = (interest: Interest) => {
    // Check if interest already exists
    const exists = editableInterests.some(item => item.id === interest.id);
    if (exists) return;

    // Add the interest to editable list
    setEditableInterests([...editableInterests, { 
      ...interest, 
      isPrimary: false, 
      visibility: 'EVERYONE' 
    }]);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Add custom interest
  const handleAddCustomInterest = () => {
    if (!searchTerm.trim()) return;
    
    // Create a new custom interest
    const customInterest: Interest = {
      id: -Date.now(), // Temporary negative ID to identify custom interests
      label: searchTerm,
      customLabel: searchTerm,
      category: '',
      isPrimary: false,
      visibility: 'EVERYONE'
    };
    
    setEditableInterests([...editableInterests, customInterest]);
    setSearchTerm('');
    setSearchResults([]);
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
      const response = await apiRequest('POST', `/api/employees/${userId}/interests`, editableInterests);
      
      if (response.ok) {
        const updatedInterests = await response.json();
        setInterests(updatedInterests);
        setIsModalOpen(false);
        toast({
          title: t('interests.saveSuccess'),
          description: t('interests.saveSuccessDescription'),
        });
      } else {
        throw new Error('Failed to save interests');
      }
    } catch (error) {
      console.error('Failed to save interests:', error);
      toast({
        title: t('interests.saveError'),
        description: t('interests.saveErrorDescription'),
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
            {t('interests.title')}
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
            <span className="sr-only">{t('interests.edit')}</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && !isModalOpen ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-teal-500 rounded-full border-t-transparent"></div>
          </div>
        ) : interests.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {visibleInterests.map(interest => (
                <Badge 
                  key={interest.id} 
                  variant="outline" 
                  className={`${interest.isPrimary ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-gray-50'} hover:bg-gray-100`}
                  title={interest.customLabel || interest.label}
                >
                  {interest.icon && <span className="mr-1">{interest.icon}</span>}
                  {interest.customLabel || interest.label}
                </Badge>
              ))}
            </div>
            {hasMoreInterests && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-500" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? t('interests.showLess') : t('interests.showMore', { count: interests.length - 5 })}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            {isCurrentUser ? t('interests.emptyCurrentUser') : t('interests.emptyOtherUser')}
          </div>
        )}
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('interests.editTitle')}</DialogTitle>
          </DialogHeader>
          
          {/* Search input */}
          <div className="space-y-4 my-4">
            <div className="relative">
              <Input
                placeholder={t('interests.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
              <div className="absolute w-full mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-lg z-10">
                {searchTerm.length >= 2 ? (
                  searchResults.length > 0 ? (
                    <div className="p-1">
                      {searchResults.map(result => (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleAddInterest(result)}
                        >
                          <div className="flex items-center">
                            {result.icon && <span className="mr-2">{result.icon}</span>}
                            <span>{result.label}</span>
                          </div>
                          <span className="text-xs text-gray-500">{result.category}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2">
                      <p className="text-sm text-gray-500">{t('interests.noResults')}</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-1 text-blue-500" 
                        onClick={handleAddCustomInterest}
                      >
                        {t('interests.addCustom', { term: searchTerm })}
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="p-1">
                    <h4 className="text-sm font-medium px-2 py-1 text-gray-500">{t('interests.suggestedInterests')}</h4>
                    {popularInterests.map(interest => (
                      <div
                        key={interest.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={() => handleAddInterest(interest)}
                      >
                        <div className="flex items-center">
                          {interest.icon && <span className="mr-2">{interest.icon}</span>}
                          <span>{interest.label}</span>
                        </div>
                        <span className="text-xs text-gray-500">{interest.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Selected interests */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('interests.selected')}</h4>
              <div className="border rounded-md p-3 min-h-24">
                {editableInterests.length > 0 ? (
                  <div className="space-y-2">
                    {editableInterests.map(interest => (
                      <div key={interest.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <Button
                            variant={interest.isPrimary ? "default" : "outline"}
                            size="sm"
                            className={`h-6 w-6 p-0 ${interest.isPrimary ? 'bg-teal-500 hover:bg-teal-600' : ''}`}
                            onClick={() => handleTogglePrimary(interest.id)}
                            title={t('interests.markPrimary')}
                          >
                            <Check className="h-3 w-3" />
                            <span className="sr-only">{t('interests.markPrimary')}</span>
                          </Button>
                          <span>
                            {interest.icon && <span className="mr-1">{interest.icon}</span>}
                            {interest.customLabel || interest.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={interest.visibility}
                            onValueChange={(value) => handleVisibilityChange(
                              interest.id, 
                              value as 'EVERYONE' | 'TEAM' | 'PRIVATE'
                            )}
                          >
                            <SelectTrigger className="h-7 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VISIBILITY_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {t(`interests.visibility.${option.value.toLowerCase()}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-500"
                            onClick={() => handleRemoveInterest(interest.id)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{t('interests.remove')}</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-full text-gray-500">
                    {t('interests.noInterestsSelected')}
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                {t('interests.dragDropHint')}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span> 
                  {t('common.saving')}
                </>
              ) : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InterestsSection;