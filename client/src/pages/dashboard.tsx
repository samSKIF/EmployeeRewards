import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import StatCard from '@/components/dashboard/StatCard';
import TransactionList from '@/components/dashboard/TransactionList';
import RewardCard from '@/components/dashboard/RewardCard';
import { DashboardStats } from '@platform/sdk/types';
import { Product } from '@shared/schema';
import { Coins, ArrowUp, ArrowDown, Gift } from 'lucide-react';

const Dashboard = () => {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch products for featured rewards
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/catalog'],
  });

  // Get 2 featured products (randomly)
  const featuredProducts = products
    ? [...products].sort(() => 0.5 - Math.random()).slice(0, 2)
    : [];

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="mt-3 md:mt-0">
          <span className="text-sm text-gray-500">
            Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Points"
          value={statsLoading ? '...' : (stats?.totalPoints || 0).toString()}
          icon={<Coins className="text-primary text-xl" />}
          change={{ value: '+12%', positive: true }}
          description="vs last month"
        />
        <StatCard
          title="Points Earned"
          value={statsLoading ? '...' : (stats?.pointsEarned || 0).toString()}
          icon={<ArrowUp className="text-secondary text-xl" />}
          change={{ value: '+18%', positive: true }}
          description="vs last month"
        />
        <StatCard
          title="Points Used"
          value={statsLoading ? '...' : (stats?.pointsUsed || 0).toString()}
          icon={<ArrowDown className="text-red-500 text-xl" />}
          change={{ value: '-5%', positive: false }}
          description="vs last month"
        />
        <StatCard
          title="Redemptions"
          value={statsLoading ? '...' : (stats?.redemptions || 0).toString()}
          icon={<Gift className="text-accent text-xl" />}
          change={{ value: '+20%', positive: true }}
          description="vs last month"
        />
      </div>

      {/* Recent Transactions & Featured Rewards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Transactions
            </h2>
          </div>
          <div className="p-6">
            <TransactionList />
            <div className="mt-6 text-center">
              <a
                href="/transactions"
                className="text-sm text-primary font-medium hover:underline"
              >
                View All Transactions
              </a>
            </div>
          </div>
        </div>

        {/* Featured Rewards */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Featured Rewards
            </h2>
          </div>
          <div className="p-6">
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="h-32 bg-gray-200 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                      <div className="h-8 mt-2 flex justify-between">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {featuredProducts.map((product) => (
                  <RewardCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-6">
                No rewards available yet.
              </p>
            )}
            <div className="mt-6 text-center">
              <a
                href="/shop"
                className="text-sm text-primary font-medium hover:underline"
              >
                Browse All Rewards
              </a>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
