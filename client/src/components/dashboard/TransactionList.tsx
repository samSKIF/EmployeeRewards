import { useQuery } from '@tanstack/react-query';
import { TransactionWithDetails } from '@platform/sdk/types';
import { format } from 'date-fns';

const TransactionList = () => {
  // Fetch recent transactions
  const { data: transactions, isLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ['/api/transactions'],
  });

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4"
          >
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="ml-4">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  // Get only the last 4 transactions
  const recentTransactions = transactions?.slice(0, 4) || [];

  return (
    <div className="space-y-4">
      {recentTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="flex items-center justify-between pb-4 border-b border-gray-100"
        >
          <div className="flex items-center">
            <div
              className={`h-10 w-10 rounded-full ${
                transaction.isDebit
                  ? 'bg-red-100 text-red-500'
                  : 'bg-green-100 text-green-500'
              } flex items-center justify-center`}
            >
              {transaction.isDebit ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              )}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-800">
                {transaction.description}
              </p>
              <p className="text-xs text-gray-500">
                {transaction.createdAt
                  ? format(new Date(transaction.createdAt), 'MMM dd, yyyy')
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                transaction.isDebit ? 'text-red-500' : 'text-green-500'
              }`}
            >
              {transaction.isDebit ? '-' : '+'}
              {transaction.amount} points
            </p>
          </div>
        </div>
      ))}

      {recentTransactions.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500">No transactions yet.</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
