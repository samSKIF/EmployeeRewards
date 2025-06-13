import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cake, Calendar, Heart, Users, MapPin, Building2, Trophy } from "lucide-react";
import { format, isToday, isTomorrow, addDays, subDays } from "date-fns";

interface CelebrationUser {
  id: number;
  name: string;
  surname: string;
  avatarUrl?: string;
  department: string;
  location: string;
  birthDate: string;
  hireDate: string;
  jobTitle: string;
}

interface CelebrationEvent {
  id: number;
  user: CelebrationUser;
  type: 'birthday' | 'work_anniversary';
  date: string;
  yearsOfService?: number;
  hasReacted: boolean;
  hasCommented: boolean;
}

export default function CelebrationCenter() {
  const [showModal, setShowModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const queryClient = useQueryClient();

  // Fetch today's celebrations
  const { data: todayCelebrations } = useQuery<CelebrationEvent[]>({
    queryKey: ['/api/celebrations/today']
  });

  // Fetch upcoming celebrations (next 5 days)
  const { data: upcomingCelebrations } = useQuery<CelebrationEvent[]>({
    queryKey: ['/api/celebrations/upcoming']
  });

  // Fetch extended celebrations for modal (last 5 days + today + next 5 days)
  const { data: extendedCelebrations } = useQuery<CelebrationEvent[]>({
    queryKey: ['/api/celebrations/extended', departmentFilter, locationFilter],
    enabled: showModal
  });

  // Fetch filter options
  const { data: departments } = useQuery<string[]>({
    queryKey: ['/api/users/departments']
  });

  const { data: locations } = useQuery<string[]>({
    queryKey: ['/api/users/locations']
  });

  const getInitials = (name: string, surname: string) => {
    return `${name[0]}${surname?.[0] || ''}`.toUpperCase();
  };

  const formatCelebrationText = (event: CelebrationEvent) => {
    const fullName = `${event.user.name} ${event.user.surname}`;

    if (event.type === 'birthday') {
      if (isToday(new Date(event.date))) {
        return `${fullName} is celebrating their birthday today! 🎉`;
      }
      return `${fullName} will celebrate their birthday on ${format(new Date(event.date), 'MMM dd')}`;
    } else {
      const years = event.yearsOfService || 0;
      if (isToday(new Date(event.date))) {
        return `${fullName} is celebrating ${years} ${years === 1 ? 'year' : 'years'} with us today! 🎊`;
      }
      return `${fullName} will celebrate ${years} ${years === 1 ? 'year' : 'years'} with us on ${format(new Date(event.date), 'MMM dd')}`;
    }
  };

  const getTodaysMessage = () => {
    if (!todayCelebrations?.length) {
      return "No celebrations today, but check what's coming up!";
    }

    const todaysBirthdays = todayCelebrations.filter(c => c.type === 'birthday');
    const todaysAnniversaries = todayCelebrations.filter(c => c.type === 'work_anniversary');

    if (todaysBirthdays.length > 0) {
      const firstPerson = todaysBirthdays[0];
      const name = `${firstPerson.user.name} ${firstPerson.user.surname}`;

      if (todaysBirthdays.length === 1 && todaysAnniversaries.length === 0) {
        return `${name} is celebrating their birthday today! 🎂`;
      } else if (todaysBirthdays.length > 1) {
        return `${name} and ${todaysBirthdays.length - 1} other${todaysBirthdays.length > 2 ? 's' : ''} celebrating birthdays today! 🎂`;
      }
    }

    if (todaysAnniversaries.length > 0) {
      const firstPerson = todaysAnniversaries[0];
      const name = `${firstPerson.user.name} ${firstPerson.user.surname}`;
      return `${name} is celebrating their work anniversary today! 🎊`;
    }

    return "Multiple celebrations today! Click to see all.";
  };

  // Get full comment with user info to return
  const filteredExtendedCelebrations = Array.isArray(extendedCelebrations) 
    ? extendedCelebrations.filter(event => {
        const matchesDepartment = departmentFilter === "all" || event.user?.department === departmentFilter;
        const matchesLocation = locationFilter === "all" || event.user?.location === locationFilter;
        return matchesDepartment && matchesLocation;
      })
    : [];

  const groupedCelebrations = filteredExtendedCelebrations?.reduce((groups, event) => {
    const dateKey = event.date;
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, CelebrationEvent[]>) || {};

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cake className="w-5 h-5 text-pink-500" />
          Celebrations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's celebration summary */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
            <Cake className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {getTodaysMessage()}
            </p>
            {upcomingCelebrations && upcomingCelebrations.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {upcomingCelebrations.length} upcoming celebration{upcomingCelebrations.length !== 1 ? 's' : ''} this week
              </p>
            )}
          </div>
        </div>

        {/* Upcoming celebrations preview */}
        {upcomingCelebrations && upcomingCelebrations.slice(0, 2).map((event) => (
          <div key={`${event.id}-${event.type}`} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            <Avatar className="w-8 h-8">
              <AvatarImage src={event.user.avatarUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(event.user.name, event.user.surname)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {event.user.name} {event.user.surname}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {event.type === 'birthday' ? (
                  <Cake className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
                {format(new Date(event.date), 'MMM dd')}
                {event.yearsOfService && (
                  <span>• {event.yearsOfService} years</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Action buttons */}
        {true && (
          <>
        <div className="flex gap-2 pt-2">
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                View All
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-pink-500" />
                  Team Celebrations
                </DialogTitle>
                  <DialogDescription>
                    All upcoming celebrations and milestones
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  {extendedCelebrations?.map((celebration) => (
                    <div key={celebration.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="rounded-full bg-pink-100 p-2">
                        {celebration.type === 'birthday' ? (
                          <Cake className="w-4 h-4 text-pink-500" />
                        ) : (
                          <Trophy className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{celebration.user.name}</h4>
                        <p className="text-sm text-gray-500">{celebration.date}</p>
                        <p className="text-sm">{formatCelebrationText(celebration)}</p>
                      </div>
                    </div>
                  ))}
                </div>

              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <Building2 className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments && Object.keys(departments).map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger>
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations && Object.keys(locations).map((location) => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Celebrations timeline */}
              <div className="space-y-6">
                {Object.entries(groupedCelebrations)
                  .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                  .map(([date, events]) => {
                    const celebrationDate = new Date(date);
                    const isPast = celebrationDate < new Date() && !isToday(celebrationDate);
                    const isTodayDate = isToday(celebrationDate);

                    return (
                      <div key={date} className={`p-4 rounded-lg border ${
                        isTodayDate ? 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800' :
                        isPast ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700' :
                        'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold">
                            {format(celebrationDate, 'EEEE, MMMM dd, yyyy')}
                          </h3>
                          {isTodayDate && (
                            <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                              Today
                            </Badge>
                          )}
                          {isTomorrow(celebrationDate) && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Tomorrow
                            </Badge>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {events.map((event) => (
                            <div
                              key={`${event.id}-${event.type}`}
                              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border"
                            >
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={event.user.avatarUrl} />
                                <AvatarFallback>
                                  {getInitials(event.user.name, event.user.surname)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">
                                  {event.user.name} {event.user.surname}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {event.user.jobTitle} • {event.user.department}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {event.type === 'birthday' ? (
                                    <Badge variant="outline" className="text-pink-600 border-pink-600">
                                      <Cake className="w-3 h-3 mr-1" />
                                      Birthday
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                                      <Calendar className="w-3 h-3 mr-1" />
                                      {event.yearsOfService} Year{event.yearsOfService !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                  {isPast && !event.hasReacted && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                                      No reaction
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {(isTodayDate || isPast) && (
                                <Button size="sm" variant="outline">
                                  <Heart className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </DialogContent>
          </Dialog>

          {todayCelebrations && todayCelebrations.length > 0 && (
            <Button 
              size="sm" 
              className="bg-pink-500 hover:bg-pink-600"
              onClick={() => {
                const celebration = todayCelebrations?.[0];
                if (celebration) {
                  fetch(`/api/celebrations/${celebration.id}/react`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }).then(() => {
                    // Refetch celebrations to update UI
                    queryClient.invalidateQueries({ queryKey: ['/api/celebrations/today'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/celebrations/upcoming'] });
                  });
                }
              }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Celebrate
            </Button>
          )}
        </div>
        </>
        )}
      </CardContent>
    </Card>
  );
}