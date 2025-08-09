import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { TransactionWithDetails } from '@platform/sdk/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TransactionTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all transactions
  const { data: transactions, isLoading } = useQuery<TransactionWithDetails[]>({
    queryKey: ['/api/transactions'],
  });

  // Paginate transactions
  const totalTransactions = transactions?.length || 0;
  const totalPages = Math.ceil(totalTransactions / itemsPerPage);

  const paginatedTransactions = transactions
    ? transactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded w-full mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Admin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTransactions.length > 0 ? (
            paginatedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="font-medium">
                  {transaction.userName || 'System'}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.reason === 'birthday_bonus'
                        ? 'bg-indigo-100 text-indigo-800'
                        : transaction.isDebit
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {transaction.reason === 'birthday_bonus'
                      ? 'Birthday'
                      : transaction.reason === 'product_redemption'
                        ? 'Redemption'
                        : transaction.reason || 'Award'}
                  </span>
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell
                  className={`font-medium ${
                    transaction.isDebit ? 'text-red-500' : 'text-green-500'
                  }`}
                >
                  {transaction.isDebit ? '-' : '+'}
                  {transaction.amount}
                </TableCell>
                <TableCell>
                  {transaction.creatorName ||
                    (transaction.reason === 'birthday_bonus' ? (
                      <span className="italic text-gray-400">Automated</span>
                    ) : (
                      'System'
                    ))}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No transactions found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {totalTransactions > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalTransactions)}
              </span>{' '}
              of <span className="font-medium">{totalTransactions}</span>{' '}
              results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;
