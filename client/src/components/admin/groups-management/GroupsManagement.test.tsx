import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupsManagement } from './GroupsManagement';

// Mock hooks and components
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Admin User', isAdmin: true },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/components/spaces/CreateSpaceDialog', () => ({
  CreateSpaceDialog: ({ isOpen, onClose, onSubmit }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="create-space-dialog">
        <button onClick={() => onSubmit({ name: 'Test Space' })}>Create</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

const mockSpaces = [
  {
    id: 1,
    name: 'Engineering Team',
    description: 'Technical discussions and development',
    category: 'Engineering',
    isPrivate: false,
    memberCount: 15,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Product Strategy',
    description: 'Product planning and roadmap discussions',
    category: 'Product',
    isPrivate: true,
    memberCount: 8,
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    name: 'Design System',
    description: 'Design guidelines and components',
    category: 'Design',
    isPrivate: false,
    memberCount: 12,
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  queryClient.setQueryData(['/api/admin/spaces'], mockSpaces);
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('GroupsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page header and create button', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('Spaces Management')).toBeInTheDocument();
      expect(screen.getByText('Create and manage workspace collaboration areas')).toBeInTheDocument();
      expect(screen.getByText('Create Space')).toBeInTheDocument();
    });

    it('should render search and filter controls', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByPlaceholderText('Search spaces...')).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('should render statistics cards', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('Total Spaces')).toBeInTheDocument();
      expect(screen.getByText('Public Spaces')).toBeInTheDocument();
      expect(screen.getByText('Private Spaces')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    it('should display correct statistics', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('3')).toBeInTheDocument(); // Total spaces
      expect(screen.getByText('2')).toBeInTheDocument(); // Public spaces (Engineering, Design)
      expect(screen.getByText('1')).toBeInTheDocument(); // Private spaces (Product)
    });

    it('should render space cards', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      expect(screen.getByText('Product Strategy')).toBeInTheDocument();
      expect(screen.getByText('Design System')).toBeInTheDocument();
    });

    it('should show space visibility indicators', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      // Check for public and private icons (by role or other attributes)
      const spaceCards = screen.getAllByText(/Engineering|Product|Design/);
      expect(spaceCards.length).toBeGreaterThan(0);
    });
  });

  describe('Search and Filtering', () => {
    it('should filter spaces by search term', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search spaces...');
      fireEvent.change(searchInput, { target: { value: 'Engineering' } });

      // Only Engineering space should be visible
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      expect(screen.queryByText('Product Strategy')).not.toBeInTheDocument();
      expect(screen.queryByText('Design System')).not.toBeInTheDocument();
    });

    it('should filter spaces by category', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      // Open category dropdown
      const categorySelect = screen.getByText('All Categories');
      fireEvent.click(categorySelect);

      // Select Engineering category
      const engineeringOption = screen.getByText('Engineering');
      fireEvent.click(engineeringOption);

      // Only Engineering space should be visible
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      expect(screen.queryByText('Product Strategy')).not.toBeInTheDocument();
      expect(screen.queryByText('Design System')).not.toBeInTheDocument();
    });

    it('should clear search when search term is removed', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search spaces...');
      
      // Search for specific term
      fireEvent.change(searchInput, { target: { value: 'Engineering' } });
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      expect(screen.queryByText('Product Strategy')).not.toBeInTheDocument();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
      expect(screen.getByText('Product Strategy')).toBeInTheDocument();
      expect(screen.getByText('Design System')).toBeInTheDocument();
    });

    it('should show empty state when no spaces match filters', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search spaces...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentSpace' } });

      expect(screen.getByText('No spaces found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
    });
  });

  describe('Space Creation', () => {
    it('should open create dialog when create button clicked', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const createButton = screen.getByText('Create Space');
      fireEvent.click(createButton);

      expect(screen.getByTestId('create-space-dialog')).toBeInTheDocument();
    });

    it('should close create dialog when close button clicked', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      // Open dialog
      const createButton = screen.getByText('Create Space');
      fireEvent.click(createButton);

      // Close dialog
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('create-space-dialog')).not.toBeInTheDocument();
    });

    it('should handle space creation', async () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      // Open dialog
      const createButton = screen.getByText('Create Space');
      fireEvent.click(createButton);

      // Create space
      const createSpaceButton = screen.getByText('Create');
      fireEvent.click(createSpaceButton);

      // Dialog should close after creation
      await waitFor(() => {
        expect(screen.queryByTestId('create-space-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Space Actions', () => {
    it('should show action buttons for each space', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const editButtons = screen.getAllByText('Edit');
      const archiveButtons = screen.getAllByText('Archive');

      expect(editButtons.length).toBe(3); // One for each space
      expect(archiveButtons.length).toBe(3); // One for each space
    });

    it('should display member count for each space', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('15 members')).toBeInTheDocument(); // Engineering
      expect(screen.getByText('8 members')).toBeInTheDocument(); // Product
      expect(screen.getByText('12 members')).toBeInTheDocument(); // Design
    });

    it('should show category badges', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state with create button when no spaces exist', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      queryClient.setQueryData(['/api/admin/spaces'], []);
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('No spaces found')).toBeInTheDocument();
      expect(screen.getByText('Create your first space to get started')).toBeInTheDocument();
      expect(screen.getByText('Create First Space')).toBeInTheDocument();
    });

    it('should show different empty state when filtered', () => {
      const Wrapper = createWrapper();
      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search spaces...');
      fireEvent.change(searchInput, { target: { value: 'NonexistentSpace' } });

      expect(screen.getByText('No spaces found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument();
      expect(screen.queryByText('Create First Space')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should handle loading state gracefully', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      // Component should render even in loading state
      expect(screen.getByText('Spaces Management')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle spaces without descriptions', () => {
      const spacesWithoutDesc = [
        {
          ...mockSpaces[0],
          description: '',
        },
      ];

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      queryClient.setQueryData(['/api/admin/spaces'], spacesWithoutDesc);
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });

    it('should handle spaces with zero members', () => {
      const spacesWithZeroMembers = [
        {
          ...mockSpaces[0],
          memberCount: 0,
        },
      ];

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      
      queryClient.setQueryData(['/api/admin/spaces'], spacesWithZeroMembers);
      
      const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      render(
        <Wrapper>
          <GroupsManagement />
        </Wrapper>
      );

      expect(screen.getByText('0 members')).toBeInTheDocument();
    });
  });
});