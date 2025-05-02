import React from 'react';
import { Gift, CreditCard, ChevronRight, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface WalletWidgetProps {
  balance?: number;
}

const WalletWidget: React.FC<WalletWidgetProps> = ({ balance = 0 }) => {
  // Fetch the user's balance from the API
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ["/api/points/balance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/points/balance");
      return res.json();
    }
  });

  const userBalance = balanceData?.balance || balance;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      <div className="px-4 pt-4 pb-3">
        <h2 className="font-bold text-gray-800 mb-3">ThrivioHR Points</h2>
        
        {/* To Give section */}
        <div className="border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center mr-3">
                <Gift className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500 font-medium">TO GIVE</div>
                <div className="text-xl font-bold text-blue-600">{userBalance}</div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center">
            <span className="mr-1">300 Point Bonus</span>
            <Info className="h-3 w-3" />
          </div>
        </div>
        
        {/* To Spend section */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center mr-3">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500 font-medium">TO SPEND</div>
                <div className="text-xl font-bold text-green-600">{Math.floor(userBalance * 0.8)}</div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 p-4 text-center">
        <div className="text-xs text-gray-500 mb-2 font-medium">#thanksmatter</div>
        <button className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
          Show Details
        </button>
      </div>
    </div>
  );
};

export default WalletWidget;