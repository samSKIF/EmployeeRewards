import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { OrderWithDetails } from '@platform/sdk/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const OrdersTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null
  );
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const itemsPerPage = 10;

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all orders
  const { data: orders, isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ['/api/orders'],
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/orders/${id}`, {
        status,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: 'Order updated',
        description: 'The order status has been updated successfully.',
      });
      setIsOrderDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update order',
        description:
          error.message || 'There was an error updating the order status.',
      });
    },
  });

  // Filter orders based on search and filters
  const filteredOrders = orders
    ? orders.filter((order) => {
        const matchesSearch =
          order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `#ORD-${order.id}`.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || order.status === statusFilter;

        let matchesTime = true;
        if (timeFilter !== 'all') {
          const orderDate = new Date(order.createdAt);
          const now = new Date();

          if (timeFilter === 'today') {
            matchesTime = orderDate.toDateString() === now.toDateString();
          } else if (timeFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesTime = orderDate >= weekAgo;
          } else if (timeFilter === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchesTime = orderDate >= monthAgo;
          }
        }

        return matchesSearch && matchesStatus && matchesTime;
      })
    : [];

  // Paginate orders
  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / itemsPerPage);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const viewOrder = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsOrderDialogOpen(true);
  };

  const updateOrderStatus = (status: string) => {
    if (!selectedOrder) return;
    updateOrderMutation.mutate({ id: selectedOrder.id, status });
  };

  // Get next status based on current status
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'processing';
      case 'processing':
        return 'shipped';
      case 'shipped':
        return 'completed';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded w-full mb-4"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded w-full mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.length > 0 ? (
              paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    #{`ORD-${order.id}`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{order.userName}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {/* Product image would go here if available */}
                      <div className="ml-3 text-sm font-medium">
                        {order.productName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{order.points}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${order.status === 'processing' ? 'bg-blue-100 text-blue-800' : ''}
                        ${order.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : ''}
                        ${order.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      `}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="text-primary hover:text-indigo-800 h-auto p-0"
                      onClick={() => viewOrder(order)}
                    >
                      View
                    </Button>
                    {order.status !== 'completed' && (
                      <Button
                        variant="link"
                        className="text-green-500 hover:text-green-700 ml-3 h-auto p-0"
                        onClick={() => {
                          setSelectedOrder(order);
                          updateOrderStatus(getNextStatus(order.status));
                        }}
                      >
                        {order.status === 'pending' && 'Process'}
                        {order.status === 'processing' && 'Ship'}
                        {order.status === 'shipped' && 'Complete'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4">
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalOrders > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalOrders)}
              </span>{' '}
              of <span className="font-medium">{totalOrders}</span> results
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

      {/* Order Details Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              View and manage order information.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Order ID
                  </h4>
                  <p className="mt-1">#{`ORD-${selectedOrder.id}`}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Date</h4>
                  <p className="mt-1">
                    {format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">
                    Customer
                  </h4>
                  <p className="mt-1">{selectedOrder.userName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Points</h4>
                  <p className="mt-1">{selectedOrder.points}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Product</h4>
                  <p className="mt-1">{selectedOrder.productName}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <p className="mt-1">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' : ''}
                        ${selectedOrder.status === 'shipped' ? 'bg-indigo-100 text-indigo-800' : ''}
                        ${selectedOrder.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      `}
                    >
                      {selectedOrder.status.charAt(0).toUpperCase() +
                        selectedOrder.status.slice(1)}
                    </span>
                  </p>
                </div>
                {selectedOrder.externalRef && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-gray-500">
                      {selectedOrder.externalRef.includes('http')
                        ? 'Gift Card Link'
                        : 'Order Reference'}
                    </h4>
                    <p className="mt-1 break-all text-sm">
                      {selectedOrder.externalRef}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOrderDialogOpen(false)}
            >
              Close
            </Button>
            {selectedOrder && selectedOrder.status !== 'completed' && (
              <Button
                onClick={() =>
                  updateOrderStatus(getNextStatus(selectedOrder.status))
                }
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? (
                  'Processing...'
                ) : (
                  <>
                    {selectedOrder.status === 'pending' && 'Mark as Processing'}
                    {selectedOrder.status === 'processing' && 'Mark as Shipped'}
                    {selectedOrder.status === 'shipped' && 'Mark as Completed'}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrdersTable;
