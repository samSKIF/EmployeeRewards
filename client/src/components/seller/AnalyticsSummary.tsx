import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

// Mock data for visualizations
const AnalyticsSummary = () => {
  // Fetch orders for calculations
  const { data: orders } = useQuery({
    queryKey: ['/api/orders'],
  });

  // Fetch products for calculations
  const { data: products } = useQuery({
    queryKey: ['/api/catalog'],
  });

  // Calculate summary statistics
  const totalOrders = orders?.length || 0;
  const pointsRedeemed =
    orders?.reduce((sum, order) => sum + (order.points || 0), 0) || 0;
  const avgPointsPerOrder = totalOrders
    ? Math.round(pointsRedeemed / totalOrders)
    : 0;

  // Calculate basic product analytics
  const productCounts =
    products?.reduce((acc: Record<string, number>, product) => {
      const orderCount =
        orders?.filter((o) => o.productId === product.id).length || 0;
      acc[product.name] = orderCount;
      return acc;
    }, {}) || {};

  // Get top products
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Calculate category distribution
  const categoryDistribution =
    products?.reduce((acc: Record<string, number>, product) => {
      if (!acc[product.category]) {
        acc[product.category] = 0;
      }

      const orderCount =
        orders?.filter((o) => o.productId === product.id).length || 0;
      acc[product.category] += orderCount;

      return acc;
    }, {}) || {};

  // Calculate percentage for visualization
  const totalCategoryOrders = Object.values(categoryDistribution).reduce(
    (sum, val) => sum + val,
    0
  );
  const categoryPercentages = Object.entries(categoryDistribution).map(
    ([category, count]) => ({
      category,
      percentage: totalCategoryOrders
        ? Math.round((count / totalCategoryOrders) * 100)
        : 0,
    })
  );

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">
                Total Orders
              </h3>
              <span className="text-xs text-green-500 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                +15%
              </span>
            </div>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs text-gray-500 mt-1">
              Updated {format(new Date(), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">
                Points Redeemed
              </h3>
              <span className="text-xs text-green-500 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                +32%
              </span>
            </div>
            <p className="text-2xl font-bold">
              {pointsRedeemed.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total lifetime points</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500">
                Avg. Points per Order
              </h3>
              <span className="text-xs text-green-500 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                +8%
              </span>
            </div>
            <p className="text-2xl font-bold">{avgPointsPerOrder}</p>
            <p className="text-xs text-gray-500 mt-1">Points per redemption</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-5">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Monthly Redemption Trend
          </h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              Monthly redemption trend visualization would appear here in
              production.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Top Products
            </h3>
            <div className="space-y-4">
              {topProducts.length > 0 ? (
                topProducts.map(([productName, count], index) => {
                  const product = products?.find((p) => p.name === productName);
                  const percentage = totalOrders
                    ? Math.round((count / totalOrders) * 100)
                    : 0;

                  return (
                    <div className="flex items-center" key={index}>
                      <div className="h-10 w-10 flex-shrink-0">
                        {product && (
                          <img
                            className="h-10 w-10 rounded-md object-cover"
                            src={product.imageUrl}
                            alt={productName}
                          />
                        )}
                      </div>
                      <div className="ml-4 flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {productName}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {percentage}%
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No product data available.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Categories Distribution
            </h3>
            <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-lg p-4">
              {categoryPercentages.length > 0 ? (
                <div className="w-full space-y-4">
                  {categoryPercentages.map((category, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{category.category}</span>
                        <span>{category.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  Category distribution visualization would appear here.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsSummary;
