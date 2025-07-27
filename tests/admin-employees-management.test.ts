import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { storage } from '../server/storage';

// Mock storage
jest.mock('../server/storage');
const mockStorage = storage as jest.Mocked<typeof storage>;

// Admin Employees Management Test Suite
// Tests for all features worked on since admin restructuring
describe('Admin Employees Management Features', () => {
  let app: express.Application;
  let authToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated admin user
    authToken = 'valid-admin-token';
  });

  describe('Employee Directory Management', () => {
    describe('GET /api/users - Employee List', () => {
      it('should return paginated employee list with proper filtering', async () => {
        const mockEmployees = [
          {
            id: 1,
            name: 'John Smith',
            email: 'john@company.com',
            department: 'Engineering',
            jobTitle: 'Senior Developer',
            status: 'active',
            organizationId: 1
          },
          {
            id: 2,
            name: 'Jane Doe',
            email: 'jane@company.com',
            department: 'Marketing',
            jobTitle: 'Marketing Manager',
            status: 'active',
            organizationId: 1
          }
        ];

        mockStorage.getUsers.mockResolvedValue(mockEmployees);
        mockStorage.getUserCount.mockResolvedValue(2);

        const response = await request(app)
          .get('/api/users?page=1&limit=10&status=active')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('users');
        expect(response.body).toHaveProperty('total');
        expect(response.body.users).toHaveLength(2);
        expect(mockStorage.getUsers).toHaveBeenCalledWith(
          1, // organizationId
          { page: 1, limit: 10, status: 'active' }
        );
      });

      it('should filter employees by department', async () => {
        const engineeringEmployees = [
          {
            id: 1,
            name: 'John Smith',
            email: 'john@company.com',
            department: 'Engineering',
            jobTitle: 'Senior Developer',
            status: 'active',
            organizationId: 1
          }
        ];

        mockStorage.getUsers.mockResolvedValue(engineeringEmployees);
        mockStorage.getUserCount.mockResolvedValue(1);

        const response = await request(app)
          .get('/api/users?department=Engineering')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.users).toHaveLength(1);
        expect(response.body.users[0].department).toBe('Engineering');
      });

      it('should filter employees by location', async () => {
        const nyEmployees = [
          {
            id: 1,
            name: 'John Smith',
            email: 'john@company.com',
            location: 'New York',
            status: 'active',
            organizationId: 1
          }
        ];

        mockStorage.getUsers.mockResolvedValue(nyEmployees);
        mockStorage.getUserCount.mockResolvedValue(1);

        const response = await request(app)
          .get('/api/users?location=New York')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.users).toHaveLength(1);
        expect(response.body.users[0].location).toBe('New York');
      });
    });

    describe('PUT /api/users/:id - Employee Profile Updates', () => {
      it('should update employee basic information', async () => {
        const updatedEmployee = {
          id: 1,
          name: 'John Updated Smith',
          email: 'john.updated@company.com',
          jobTitle: 'Lead Developer',
          department: 'Engineering',
          phoneNumber: '+1234567890',
          organizationId: 1
        };

        mockStorage.updateUser.mockResolvedValue(updatedEmployee);

        const response = await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'John Updated Smith',
            email: 'john.updated@company.com',
            jobTitle: 'Lead Developer',
            phoneNumber: '+1234567890'
          })
          .expect(200);

        expect(response.body.name).toBe('John Updated Smith');
        expect(response.body.jobTitle).toBe('Lead Developer');
        expect(mockStorage.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({
          name: 'John Updated Smith',
          job_title: 'Lead Developer' // snake_case conversion
        }));
      });

      it('should update employee birthday and persist correctly', async () => {
        const updatedEmployee = {
          id: 1,
          name: 'John Smith',
          birthDate: '1990-05-15',
          organizationId: 1
        };

        mockStorage.updateUser.mockResolvedValue(updatedEmployee);

        const response = await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            birthDate: '1990-05-15'
          })
          .expect(200);

        expect(response.body.birthDate).toBe('1990-05-15');
        expect(mockStorage.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({
          birth_date: '1990-05-15' // snake_case field mapping
        }));
      });

      it('should handle field mapping between camelCase frontend and snake_case database', async () => {
        const frontendData = {
          phoneNumber: '+1234567890',
          jobTitle: 'Senior Manager',
          hireDate: '2023-01-15',
          managerEmail: 'manager@company.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        };

        const expectedDbFields = {
          phone_number: '+1234567890',
          job_title: 'Senior Manager',
          hire_date: '2023-01-15',
          manager_email: 'manager@company.com',
          avatar_url: 'https://example.com/avatar.jpg'
        };

        mockStorage.updateUser.mockResolvedValue({ id: 1, ...frontendData, organizationId: 1 });

        await request(app)
          .put('/api/users/1')
          .set('Authorization', `Bearer ${authToken}`)
          .send(frontendData)
          .expect(200);

        expect(mockStorage.updateUser).toHaveBeenCalledWith(1, expectedDbFields);
      });
    });

    describe('POST /api/users - Create New Employee', () => {
      it('should create new employee with all required fields', async () => {
        const newEmployee = {
          name: 'New Employee',
          email: 'new@company.com',
          department: 'HR',
          jobTitle: 'HR Specialist',
          status: 'active',
          organizationId: 1
        };

        mockStorage.createUser.mockResolvedValue({ id: 3, ...newEmployee });
        mockStorage.getUserCount.mockResolvedValue(10); // Current user count
        mockStorage.getOrganizationById.mockResolvedValue({
          id: 1,
          name: 'Test Org',
          subscription: { subscribedUsers: 50, isActive: true }
        });

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newEmployee)
          .expect(201);

        expect(response.body.id).toBe(3);
        expect(response.body.name).toBe('New Employee');
        expect(mockStorage.createUser).toHaveBeenCalledWith(expect.objectContaining({
          name: 'New Employee',
          email: 'new@company.com',
          organization_id: 1
        }));
      });

      it('should enforce subscription user limits', async () => {
        mockStorage.getUserCount.mockResolvedValue(50); // At limit
        mockStorage.getOrganizationById.mockResolvedValue({
          id: 1,
          name: 'Test Org',
          subscription: { subscribedUsers: 50, isActive: true }
        });

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Over Limit User',
            email: 'overlimit@company.com',
            organizationId: 1
          })
          .expect(400);

        expect(response.body.message).toContain('subscription limit');
        expect(mockStorage.createUser).not.toHaveBeenCalled();
      });
    });

    describe('Bulk Operations', () => {
      it('should handle bulk status updates', async () => {
        const userIds = [1, 2, 3];
        const updatedUsers = userIds.map(id => ({
          id,
          name: `User ${id}`,
          status: 'inactive',
          organizationId: 1
        }));

        mockStorage.updateUsers.mockResolvedValue(updatedUsers);

        const response = await request(app)
          .patch('/api/users/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            userIds,
            updates: { status: 'inactive' }
          })
          .expect(200);

        expect(response.body.updatedCount).toBe(3);
        expect(mockStorage.updateUsers).toHaveBeenCalledWith(userIds, { status: 'inactive' });
      });

      it('should handle bulk delete operations', async () => {
        const userIds = [1, 2, 3];
        mockStorage.deleteUsers.mockResolvedValue(3);

        const response = await request(app)
          .delete('/api/users/bulk')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ userIds })
          .expect(200);

        expect(response.body.deletedCount).toBe(3);
        expect(mockStorage.deleteUsers).toHaveBeenCalledWith(userIds);
      });
    });
  });

  describe('Spaces & Groups Management', () => {
    describe('GET /api/spaces - Spaces List', () => {
      it('should return organization spaces with member counts', async () => {
        const mockSpaces = [
          {
            id: 1,
            name: 'Engineering Team',
            description: 'Engineering discussions',
            memberCount: 15,
            isPublic: true,
            organizationId: 1
          },
          {
            id: 2,
            name: 'Marketing Hub',
            description: 'Marketing coordination',
            memberCount: 8,
            isPublic: false,
            organizationId: 1
          }
        ];

        mockStorage.getSpaces.mockResolvedValue(mockSpaces);

        const response = await request(app)
          .get('/api/spaces')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].memberCount).toBe(15);
        expect(response.body[1].memberCount).toBe(8);
      });
    });

    describe('POST /api/spaces - Create Space', () => {
      it('should create new space with proper validation', async () => {
        const newSpace = {
          name: 'New Team Space',
          description: 'A space for the new team',
          isPublic: true,
          organizationId: 1
        };

        mockStorage.createSpace.mockResolvedValue({ id: 3, ...newSpace });

        const response = await request(app)
          .post('/api/spaces')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newSpace)
          .expect(201);

        expect(response.body.id).toBe(3);
        expect(response.body.name).toBe('New Team Space');
        expect(mockStorage.createSpace).toHaveBeenCalledWith(expect.objectContaining({
          name: 'New Team Space',
          is_public: true,
          organization_id: 1
        }));
      });
    });

    describe('PUT /api/spaces/:id/members - Manage Space Members', () => {
      it('should add members to space', async () => {
        const memberIds = [1, 2, 3];
        mockStorage.addSpaceMembers.mockResolvedValue(true);

        const response = await request(app)
          .put('/api/spaces/1/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ action: 'add', memberIds })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockStorage.addSpaceMembers).toHaveBeenCalledWith(1, memberIds);
      });

      it('should remove members from space', async () => {
        const memberIds = [2, 3];
        mockStorage.removeSpaceMembers.mockResolvedValue(true);

        const response = await request(app)
          .put('/api/spaces/1/members')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ action: 'remove', memberIds })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockStorage.removeSpaceMembers).toHaveBeenCalledWith(1, memberIds);
      });
    });
  });

  describe('Employee Filters and Search', () => {
    describe('GET /api/users/departments - Department Filter', () => {
      it('should return unique departments for organization', async () => {
        const mockDepartments = ['Engineering', 'Marketing', 'HR', 'Sales'];
        mockStorage.getDepartments.mockResolvedValue(mockDepartments);

        const response = await request(app)
          .get('/api/users/departments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toEqual(mockDepartments);
        expect(mockStorage.getDepartments).toHaveBeenCalledWith(1); // organizationId
      });
    });

    describe('GET /api/users/locations - Location Filter', () => {
      it('should return unique locations for organization', async () => {
        const mockLocations = ['New York', 'San Francisco', 'London', 'Remote'];
        mockStorage.getLocations.mockResolvedValue(mockLocations);

        const response = await request(app)
          .get('/api/users/locations')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toEqual(mockLocations);
        expect(mockStorage.getLocations).toHaveBeenCalledWith(1); // organizationId
      });
    });

    describe('GET /api/users/search - Employee Search', () => {
      it('should search employees by name and email', async () => {
        const searchResults = [
          {
            id: 1,
            name: 'John Smith',
            email: 'john.smith@company.com',
            department: 'Engineering',
            organizationId: 1
          }
        ];

        mockStorage.searchUsers.mockResolvedValue(searchResults);

        const response = await request(app)
          .get('/api/users/search?q=john')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].name).toBe('John Smith');
        expect(mockStorage.searchUsers).toHaveBeenCalledWith(1, 'john');
      });
    });
  });

  describe('Team Celebrations Integration', () => {
    describe('POST /api/celebrations/generate - Birthday/Anniversary Posts', () => {
      it('should generate celebration posts for birthdays', async () => {
        const todaysBirthdays = [
          {
            id: 1,
            name: 'John Smith',
            birthDate: '1990-07-27',
            organizationId: 1
          }
        ];

        mockStorage.getBirthdaysToday.mockResolvedValue(todaysBirthdays);
        mockStorage.createCelebrationPost.mockResolvedValue({
          id: 1,
          type: 'birthday',
          employeeId: 1,
          content: "Let's celebrate John Smith's birthday! 🎉"
        });

        const response = await request(app)
          .post('/api/celebrations/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.generated).toBe(1);
        expect(mockStorage.createCelebrationPost).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'birthday',
            employee_id: 1
          })
        );
      });

      it('should generate celebration posts for work anniversaries', async () => {
        const todaysAnniversaries = [
          {
            id: 2,
            name: 'Jane Doe',
            hireDate: '2020-07-27',
            organizationId: 1
          }
        ];

        mockStorage.getAnniversariesToday.mockResolvedValue(todaysAnniversaries);
        mockStorage.createCelebrationPost.mockResolvedValue({
          id: 2,
          type: 'anniversary',
          employeeId: 2,
          content: "Congratulations to Jane Doe on 5 years with the company! 🎊"
        });

        const response = await request(app)
          .post('/api/celebrations/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.generated).toBe(1);
        expect(mockStorage.createCelebrationPost).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'anniversary',
            employee_id: 2
          })
        );
      });
    });
  });

  describe('Multi-tenant Security', () => {
    it('should enforce organization isolation in employee queries', async () => {
      // Mock user from organization 1
      const org1Employees = [
        { id: 1, name: 'Org1 User', organizationId: 1 }
      ];

      mockStorage.getUsers.mockResolvedValue(org1Employees);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify that storage method was called with organizationId filter
      expect(mockStorage.getUsers).toHaveBeenCalledWith(
        1, // organizationId should be included
        expect.any(Object)
      );
    });

    it('should prevent cross-organization data access', async () => {
      // Try to access user from different organization
      mockStorage.getUserById.mockResolvedValue(null); // No user found due to org filtering

      const response = await request(app)
        .get('/api/users/999') // User from different org
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('Profile Navigation Integration', () => {
    describe('GET /api/profile/:userId - Profile Access', () => {
      it('should allow navigation to employee profiles within organization', async () => {
        const userProfile = {
          id: 1,
          name: 'John Smith',
          email: 'john@company.com',
          department: 'Engineering',
          jobTitle: 'Senior Developer',
          organizationId: 1
        };

        mockStorage.getUserById.mockResolvedValue(userProfile);

        const response = await request(app)
          .get('/api/profile/1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.name).toBe('John Smith');
        expect(response.body.organizationId).toBe(1);
      });

      it('should enforce organization-based profile access', async () => {
        // User from different organization
        mockStorage.getUserById.mockResolvedValue(null);

        const response = await request(app)
          .get('/api/profile/999')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.message).toContain('Profile not found');
      });
    });
  });

  describe('Subscription Capacity Management', () => {
    describe('Active Employee Count System', () => {
      it('should count only active employees for subscription limits', async () => {
        const allEmployees = [
          { id: 1, status: 'active', organizationId: 1 },
          { id: 2, status: 'active', organizationId: 1 },
          { id: 3, status: 'inactive', organizationId: 1 },
          { id: 4, status: 'terminated', organizationId: 1 }
        ];

        mockStorage.getActiveUserCount.mockResolvedValue(2); // Only active users
        mockStorage.getTotalUserCount.mockResolvedValue(4); // All users

        const response = await request(app)
          .get('/api/users/count')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.activeCount).toBe(2);
        expect(response.body.totalCount).toBe(4);
      });

      it('should validate subscription limits against active employees only', async () => {
        mockStorage.getActiveUserCount.mockResolvedValue(49); // 49 active users
        mockStorage.getOrganizationById.mockResolvedValue({
          id: 1,
          subscription: { subscribedUsers: 50, isActive: true }
        });

        // Should allow creation since we're under the active limit
        mockStorage.createUser.mockResolvedValue({
          id: 50,
          name: 'New Active User',
          status: 'active',
          organizationId: 1
        });

        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'New Active User',
            email: 'new@company.com',
            status: 'active'
          })
          .expect(201);

        expect(response.body.id).toBe(50);
        expect(mockStorage.createUser).toHaveBeenCalled();
      });
    });
  });
});