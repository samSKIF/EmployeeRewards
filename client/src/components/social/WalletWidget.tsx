import React from 'react';
import { Gift, CreditCard, ChevronRight, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useBranding } from '@/context/BrandingContext';

interface WalletWidgetProps {
  balance?: number;
}

const WalletWidget: React.FC<WalletWidgetProps> = ({ balance = 0 }) => {
  // Fetch the user's balance from the API
  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ['/api/points/balance'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/points/balance');
      return res.json();
    },
  });

  // Get branding information
  const { branding } = useBranding();

  const userBalance = balanceData?.balance || balance;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-6 pt-5 pb-4">
        <h2 className="font-bold text-gray-800 text-lg mb-4">
          {branding?.organizationName || 'ThrivioHR'} Points
        </h2>

        {/* To Give section */}
        <div className="border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                <Gift className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500 font-medium whitespace-nowrap">
                  TO GIVE
                </div>
                <div className="text-xl font-bold text-blue-500">
                  {userBalance}
                </div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <span className="mr-1 whitespace-nowrap">300 Point Bonus</span>
            <Info className="h-3 w-3" />
          </div>
        </div>

        {/* To Spend section */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
                <CreditCard className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-xs uppercase text-gray-500 font-medium whitespace-nowrap">
                  TO SPEND
                </div>
                <div className="text-xl font-bold text-green-500">
                  {Math.floor(userBalance * 0.8)}
                </div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-50">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-4 text-center">
        <div className="text-xs text-gray-500 mb-2 font-medium">
          #thanksmatter
        </div>
        <button className="py-2 px-5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-sm font-medium transition-colors">
          Show Details
        </button>
      </div>
    </div>
  );
};

export default WalletWidget;
