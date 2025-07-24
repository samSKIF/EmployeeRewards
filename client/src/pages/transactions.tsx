import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import TransactionFilters from '@/components/transactions/TransactionFilters';
import TransactionTable from '@/components/transactions/TransactionTable';
import { useQuery } from '@tanstack/react-query';

const Transactions = () => {
  const [filters, setFilters] = useState({
    type: 'all',
    dateFrom: '',
    dateTo: '',
  });

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ['/api/points/balance'],
  });

  const handleApplyFilters = (newFilters: {
    type: string;
    dateFrom: string;
    dateTo: string;
  }) => {
    setFilters(newFilters);
  };

  return (
    <MainLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Transactions History
        </h1>
        <div className="mt-3 md:mt-0">
          <div className="bg-gray-100 rounded-lg py-2 px-4">
            <span className="text-sm font-medium text-gray-800">
              Current balance:{' '}
              <span className="text-primary font-bold">
                {balanceData?.balance || 0}
              </span>{' '}
              points
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Filter */}
      <TransactionFilters onApplyFilters={handleApplyFilters} />

      {/* Transactions Table */}
      <TransactionTable filters={filters} />
    </MainLayout>
  );
};

export default Transactions;
