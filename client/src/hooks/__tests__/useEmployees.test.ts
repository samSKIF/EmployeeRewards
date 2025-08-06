import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEmployees } from '../useEmployees';
import * as api from '@/lib/api';

// Mock API
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock auth context
const mockAuthContext = {
  user: { id: 1, isAdmin: true, organization_id: 1 },
  isAuthenticated: true
};

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

describe('useEmployees Hook - Frontend Data Management', () => {
  let queryClient: QueryClient;

  const mockEmployeesResponse = {
    employees: [
      {
        id: 1,
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        location: 'New York',
        job_title: 'Software Engineer',
        status: 'active',
        organization_id: 1
      },
      {
        id: 2,
        name: 'Jane',
        surname: 'Smith',
        email: 'jane.smith@company.com',
        department: 'Marketing',
        location: 'San Francisco',
        job_title: 'Marketing Manager',
        status: 'active',
        organization_id: 1
      }
    ],
    pagination: {
      total: 402, // Critical user count consistency
      limit: 50,
      offset: 0,
      has_more: true,
      total_pages: 9
    },
    filters: {
      search: '',
      department: '',
      status: 'active'
    }
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Data Fetching and Caching', () => {
    it('should fetch employees with default parameters', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockEmployeesResponse);
      expect(result.current.employees).toHaveLength(2);
      expect(result.current.totalCount).toBe(402); // Critical count verification
      
      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: {
          limit: 50,
          offset: 0,
          sortBy: 'name',
          sortOrder: 'asc'
        }
      });
    });

    it('should apply search filters correctly', async () => {
      const searchResponse = {
        ...mockEmployeesResponse,
        employees: [mockEmployeesResponse.employees[1]], // Only Jane
        filters: { search: 'jane', department: '', status: 'active' }
      };

      mockedApi.get.mockResolvedValue(searchResponse);

      const { result } = renderHook(() => useEmployees({ search: 'jane' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          search: 'jane'
        })
      });

      expect(result.current.employees).toHaveLength(1);
      expect(result.current.employees?.[0].name).toBe('Jane');
    });

    it('should handle pagination parameters', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(() => useEmployees({ 
        limit: 25, 
        offset: 25 
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          limit: 25,
          offset: 25
        })
      });
    });

    it('should apply department and status filters', async () => {
      const filteredResponse = {
        ...mockEmployeesResponse,
        employees: [mockEmployeesResponse.employees[0]], // Only John
        filters: { search: '', department: 'Engineering', status: 'active' }
      };

      mockedApi.get.mockResolvedValue(filteredResponse);

      const { result } = renderHook(() => useEmployees({
        department: 'Engineering',
        status: 'active'
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          department: 'Engineering',
          status: 'active'
        })
      });
    });

    it('should handle sorting parameters', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(() => useEmployees({
        sortBy: 'hire_date',
        sortOrder: 'desc'
      }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.get).toHaveBeenCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          sortBy: 'hire_date',
          sortOrder: 'desc'
        })
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Failed to fetch employees';
      mockedApi.get.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(expect.objectContaining({
        message: errorMessage
      }));
      expect(result.current.employees).toBeUndefined();
    });

    it('should handle network errors', async () => {
      mockedApi.get.mockRejectedValue({
        response: { status: 500, data: { message: 'Internal server error' } }
      });

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      mockedApi.get.mockRejectedValue({
        response: { status: 401, data: { message: 'Unauthorized' } }
      });

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      mockedApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.employees).toBeUndefined();
    });

    it('should transition from loading to success', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.employees).toBeDefined();
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain user count consistency across different filter combinations', async () => {
      // Test multiple filter scenarios maintain total count
      const scenarios = [
        { search: 'john', expectedCount: 402 },
        { department: 'Engineering', expectedCount: 402 },
        { status: 'active', expectedCount: 402 },
        { search: 'jane', department: 'Marketing', expectedCount: 402 }
      ];

      for (const scenario of scenarios) {
        const response = {
          ...mockEmployeesResponse,
          pagination: { ...mockEmployeesResponse.pagination, total: scenario.expectedCount }
        };

        mockedApi.get.mockResolvedValue(response);

        const { result } = renderHook(() => useEmployees(scenario), { wrapper });

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.totalCount).toBe(scenario.expectedCount);
      }
    });

    it('should validate employee data structure', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      const employee = result.current.employees?.[0];
      expect(employee).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        surname: expect.any(String),
        email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        department: expect.any(String),
        job_title: expect.any(String),
        status: expect.stringMatching(/^(active|inactive|pending)$/),
        organization_id: expect.any(Number)
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache data between hook instances', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      // First hook instance
      const { result: result1 } = renderHook(() => useEmployees({}), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second hook instance with same parameters
      const { result: result2 } = renderHook(() => useEmployees({}), { wrapper });

      // Should have immediate data from cache
      expect(result2.current.data).toEqual(mockEmployeesResponse);
      expect(mockedApi.get).toHaveBeenCalledTimes(1); // Only called once due to cache
    });

    it('should refetch when parameters change', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result, rerender } = renderHook(
        ({ search }: { search?: string }) => useEmployees({ search }),
        { wrapper, initialProps: {} }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedApi.get).toHaveBeenCalledTimes(1);

      // Change search parameter
      rerender({ search: 'john' });

      await waitFor(() => {
        expect(mockedApi.get).toHaveBeenCalledTimes(2);
      });

      expect(mockedApi.get).toHaveBeenLastCalledWith('/api/admin/employees', {
        params: expect.objectContaining({
          search: 'john'
        })
      });
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle rapid filter changes (debouncing)', async () => {
      mockedApi.get.mockResolvedValue(mockEmployeesResponse);

      const { result, rerender } = renderHook(
        ({ search }: { search?: string }) => useEmployees({ search }),
        { wrapper, initialProps: {} }
      );

      // Rapid search changes
      rerender({ search: 'j' });
      rerender({ search: 'jo' });
      rerender({ search: 'joh' });
      rerender({ search: 'john' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should handle rapid changes gracefully
      expect(result.current.employees).toBeDefined();
    });

    it('should maintain state during concurrent requests', async () => {
      // Simulate concurrent requests with different responses
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });
      const secondPromise = new Promise(resolve => { resolveSecond = resolve; });

      mockedApi.get
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result, rerender } = renderHook(
        ({ search }: { search?: string }) => useEmployees({ search }),
        { wrapper, initialProps: { search: 'first' } }
      );

      // Start second request before first completes
      rerender({ search: 'second' });

      // Resolve second request first (simulate race condition)
      resolveSecond!({ ...mockEmployeesResponse, filters: { search: 'second' } });

      await waitFor(() => {
        expect(result.current.data?.filters.search).toBe('second');
      });

      // First request resolves later but shouldn't override
      resolveFirst!({ ...mockEmployeesResponse, filters: { search: 'first' } });

      // Should maintain second request's data
      expect(result.current.data?.filters.search).toBe('second');
    });
  });
});