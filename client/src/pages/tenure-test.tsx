import React from 'react';
import UserAvatar from '@/components/common/UserAvatar';

const TenureTestPage = () => {
  // Test users with different tenure periods
  const testUsers = [
    {
      id: 1,
      name: "New Employee",
      avatarUrl: null,
      dateJoined: new Date(), // Today - should show no ring or grey ring
    },
    {
      id: 2,
      name: "1 Year Employee", 
      avatarUrl: null,
      dateJoined: new Date(2023, 0, 1), // 1+ years - should show silver ring
    },
    {
      id: 3,
      name: "5 Year Employee",
      avatarUrl: null, 
      dateJoined: new Date(2019, 0, 1), // 5+ years - should show gold ring
    },
    {
      id: 4,
      name: "10 Year Employee",
      avatarUrl: null,
      dateJoined: new Date(2014, 0, 1), // 10+ years - should show gold ring with number
    }
  ];

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Tenure Ring Test</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {testUsers.map((user) => (
          <div key={user.id} className="flex flex-col items-center space-y-2">
            <UserAvatar 
              user={user}
              size="xl"
              showTenure={true}
              showStatus={false}
            />
            <div className="text-center">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">
                Joined: {user.dateJoined.getFullYear()}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Expected Results:</h3>
        <ul className="space-y-1 text-sm">
          <li>• New Employee: No ring or grey ring</li>
          <li>• 1 Year Employee: Silver ring with glow</li>
          <li>• 5 Year Employee: Gold ring with glow</li>
          <li>• 10 Year Employee: Gold ring with number badge and intense glow</li>
        </ul>
      </div>
    </div>
  );
};

export default TenureTestPage;