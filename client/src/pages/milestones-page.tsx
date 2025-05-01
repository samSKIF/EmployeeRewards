import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import SocialLayout from "@/layouts/SocialLayout";
import { Cake, Paperclip, SendHorizontal, Gift } from "lucide-react";
import { User } from "@shared/types";
import { formatDistanceToNow } from "date-fns";

// Mock data for demonstration 
const MOCK_MILESTONES = [
  {
    id: 1,
    type: "birthday",
    user: {
      id: 2,
      name: "Chloe Hill",
      department: "Finance",
      title: "Administrative Analyst",
      avatarFallback: "CH"
    },
    date: new Date(new Date().setDate(new Date().getDate() - 1))
  },
  {
    id: 2,
    type: "anniversary",
    user: {
      id: 3,
      name: "Mark Johnson",
      department: "Engineering",
      title: "Senior Developer",
      avatarFallback: "MJ"
    },
    years: 3,
    date: new Date(new Date().setDate(new Date().getDate() - 2))
  },
  {
    id: 3,
    type: "birthday",
    user: {
      id: 4,
      name: "Sarah Williams",
      department: "Marketing",
      title: "Content Strategist",
      avatarFallback: "SW"
    },
    date: new Date(new Date().setDate(new Date().getDate() - 3))
  }
];

interface ActiveUser {
  id: number;
  name: string;
  avatarFallback: string;
}

const ACTIVE_USERS: ActiveUser[] = [
  { id: 1, name: "Andy Dwyer", avatarFallback: "AD" },
  { id: 2, name: "Donna Meagle", avatarFallback: "DM" },
  { id: 3, name: "Leslie Knope", avatarFallback: "LK" },
  { id: 4, name: "Ann Perkins", avatarFallback: "AP" }
];

const MilestonesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "birthdays" | "anniversaries">("birthdays");
  const [comments, setComments] = useState<Record<number, string>>({});
  
  const { data: currentUser } = useQuery<User | undefined>({
    queryKey: ['/api/users/me'],
  });
  
  const handleCommentChange = (id: number, value: string) => {
    setComments({
      ...comments,
      [id]: value
    });
  };
  
  const handleSendComment = (id: number) => {
    // Here you would send the comment to the server
    console.log(`Sending comment for milestone ${id}: ${comments[id]}`);
    
    // Clear the comment after sending
    setComments({
      ...comments,
      [id]: ""
    });
  };
  
  const filteredMilestones = MOCK_MILESTONES.filter(milestone => {
    if (activeTab === "all") return true;
    if (activeTab === "birthdays") return milestone.type === "birthday";
    if (activeTab === "anniversaries") return milestone.type === "anniversary";
    return true;
  });
  
  return (
    <SocialLayout>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-3/4">
          {/* Tabs */}
          <div className="flex items-center mb-6 border-b pb-2">
            <div 
              className={`mr-6 cursor-pointer font-medium ${activeTab === "all" ? "text-blue-600 border-b-2 border-blue-600 -mb-2.5 pb-2.5" : "text-gray-700"}`}
              onClick={() => setActiveTab("all")}
            >
              All Milestones
            </div>
            <div className="flex ml-4">
              <div 
                className={`mr-4 cursor-pointer ${activeTab === "birthdays" ? "text-blue-600 border-b-2 border-blue-600 -mb-2.5 pb-2.5" : "text-gray-700"}`}
                onClick={() => setActiveTab("birthdays")}
              >
                Birthdays
              </div>
              <div 
                className={`cursor-pointer ${activeTab === "anniversaries" ? "text-blue-600 border-b-2 border-blue-600 -mb-2.5 pb-2.5" : "text-gray-700"}`}
                onClick={() => setActiveTab("anniversaries")}
              >
                Anniversaries
              </div>
            </div>
            <div className="ml-auto text-sm text-gray-600">
              Filter by: 'My Company' ▼
            </div>
          </div>
          
          {/* Milestone Cards */}
          {filteredMilestones.map(milestone => (
            <Card key={milestone.id} className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {milestone.user.avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-base font-medium">
                      {milestone.type === "birthday" 
                        ? `Happy Birthday, ${milestone.user.name}!` 
                        : `Work Anniversary: ${milestone.user.name} (${milestone.years} years)`}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Department: {milestone.user.department} • Title: {milestone.user.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(milestone.date, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-xl">
                  {milestone.type === "birthday" ? <Cake className="h-5 w-5 text-pink-500"/> : <Gift className="h-5 w-5 text-blue-500"/>}
                </div>
              </CardHeader>
              <CardFooter className="border-t pt-4 pb-3">
                <div className="flex items-center w-full">
                  <Input
                    value={comments[milestone.id] || ""}
                    onChange={(e) => handleCommentChange(milestone.id, e.target.value)}
                    placeholder={`${milestone.type === "birthday" ? "Wish a happy birthday" : "Congratulate on the work anniversary"}...`}
                    className="flex-1 mr-2 bg-gray-50"
                  />
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                      <span className="text-sm font-medium">GIF</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleSendComment(milestone.id)}
                      disabled={!comments[milestone.id]?.trim()}
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
        
        <div className="md:w-1/4">
          {/* Rewards Card */}
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">Reward Points</h3>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="mb-4">
                <p className="font-medium">To Give: <span className="text-blue-600">3000 pts</span></p>
                <p className="text-sm text-gray-500">4000 pts - Spot Bonus</p>
              </div>
              <div>
                <p className="font-medium">To Spend: <span className="text-green-600">2100 pts</span></p>
                <p className="text-sm text-gray-500">2000 pts - Wellness Rewards</p>
                <p className="text-sm text-gray-500">500 pts - Team Activities</p>
                <p className="text-sm text-gray-500">1000 pts - Remote Work Setup</p>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-600">
                View Details
              </Button>
            </CardFooter>
          </Card>
          
          {/* Most Active Card */}
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-lg font-semibold">Most Active</h3>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {ACTIVE_USERS.map(user => (
                  <li key={user.id} className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {user.avatarFallback}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{user.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </SocialLayout>
  );
};

export default MilestonesPage;