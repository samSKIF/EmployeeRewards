import request from 'supertest';
import express from 'express';
import { db } from '../db';
import { channels, channelMembers, channelPosts } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../middleware/auth');
jest.mock('../storage');

// Import the router after mocking
import spacesRouter from './spacesRoutes';
import { verifyToken } from '../middleware/auth';
import { storage } from '../storage';

const mockedDb = db as jest.Mocked<typeof db>;
const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockedStorage = storage as jest.Mocked<typeof storage>;

describe('Spaces Routes', () => {
  let app: express.Application;

  const mockUser = {
    id: 1,
    organizationId: 1,
    email: 'user@example.com',
    name: 'Test User',
    isAdmin: false,
    department: 'Engineering',
  };

  const mockSpace = {
    id: 1,
    name: 'Engineering Team',
    description: 'Space for engineering discussions',
    organizationId: 1,
    createdBy: 1,
    isPrivate: false,
    memberCount: 15,
    postCount: 42,
    createdAt: new Date(),
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/spaces', spacesRouter);
    jest.clearAllMocks();

    // Default auth middleware behavior
    mockedVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('GET /spaces', () => {
    it('should return user spaces', async () => {
      const mockSpaces = [
        {
          id: 1,
          name: 'Engineering Team',
          description: 'Engineering discussions',
          organizationId: 1,
          memberCount: 15,
          isPrivate: false,
          isMember: true,
        },
        {
          id: 2,
          name: 'Product Updates',
          description: 'Product team updates',
          organizationId: 1,
          memberCount: 8,
          isPrivate: false,
          isMember: false,
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue(mockSpaces),
            }),
          }),
        }),
      });

      const response = await request(app).get('/spaces');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Engineering Team');
      expect(response.body[1].name).toBe('Product Updates');
    });

    it('should filter by search term', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/spaces')
        .query({ search: 'engineering' });

      expect(response.status).toBe(200);
    });

    it('should filter by membership status', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/spaces')
        .query({ memberOnly: 'true' });

      expect(response.status).toBe(200);
    });

    it('should handle pagination', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const response = await request(app)
        .get('/spaces')
        .query({ page: '2', limit: '10' });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /spaces', () => {
    it('should create new space successfully', async () => {
      const spaceData = {
        name: 'Marketing Team',
        description: 'Marketing team collaboration space',
        isPrivate: false,
      };

      const mockCreatedSpace = {
        id: 3,
        name: 'Marketing Team',
        description: 'Marketing team collaboration space',
        organizationId: 1,
        createdBy: 1,
        isPrivate: false,
        memberCount: 1,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedSpace]),
        }),
      });

      // Mock adding creator as member
      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const response = await request(app)
        .post('/spaces')
        .send(spaceData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Marketing Team');
      expect(response.body.created_by).toBe(1);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        description: 'Missing name field',
        // Missing name
      };

      const response = await request(app)
        .post('/spaces')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Name is required');
    });

    it('should validate name length', async () => {
      const invalidData = {
        name: 'a'.repeat(101), // Too long
        description: 'Valid description',
      };

      const response = await request(app)
        .post('/spaces')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Name too long');
    });

    it('should check for duplicate space names', async () => {
      const duplicateData = {
        name: 'Engineering Team', // Already exists
        description: 'Duplicate space',
      };

      const existingSpace = {
        id: 1,
        name: 'Engineering Team',
        organizationId: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app)
        .post('/spaces')
        .send(duplicateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Space name already exists');
    });

    it('should automatically add creator as member', async () => {
      const spaceData = {
        name: 'New Space',
        description: 'Test space',
      };

      const mockCreatedSpace = {
        id: 4,
        organizationId: 1,
        createdBy: 1,
      };

      mockedDb.insert = jest.fn()
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockCreatedSpace]),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockResolvedValue(undefined),
        });

      const response = await request(app)
        .post('/spaces')
        .send(spaceData);

      expect(response.status).toBe(201);
      expect(mockedDb.insert).toHaveBeenCalledTimes(2); // Space creation + membership
    });
  });

  describe('GET /spaces/:id', () => {
    it('should return space details', async () => {
      const mockSpaceDetails = {
        id: 1,
        name: 'Engineering Team',
        description: 'Engineering discussions',
        organizationId: 1,
        createdBy: 1,
        isPrivate: false,
        memberCount: 15,
        postCount: 42,
        isMember: true,
        creator: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockSpaceDetails]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Engineering Team');
      expect(response.body.memberCount).toBe(15);
    });

    it('should handle space not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/999');

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Space not found');
    });

    it('should prevent access to private spaces for non-members', async () => {
      const mockPrivateSpace = {
        id: 1,
        name: 'Private Space',
        isPrivate: true,
        organizationId: 1,
        isMember: false,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockPrivateSpace]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied to private space');
    });

    it('should allow access to private spaces for members', async () => {
      const mockPrivateSpace = {
        id: 1,
        name: 'Private Space',
        isPrivate: true,
        organizationId: 1,
        isMember: true,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([mockPrivateSpace]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/1');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Private Space');
    });
  });

  describe('PATCH /spaces/:id', () => {
    it('should update space successfully', async () => {
      const updateData = {
        description: 'Updated description',
        isPrivate: true,
      };

      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 1, // User is creator
      };

      const updatedSpace = {
        ...existingSpace,
        ...updateData,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedSpace]),
          }),
        }),
      });

      const response = await request(app)
        .patch('/spaces/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated description');
    });

    it('should prevent non-creators from updating space', async () => {
      const updateData = {
        description: 'Unauthorized update',
      };

      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 2, // Different user
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app)
        .patch('/spaces/1')
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only space creator can update');
    });

    it('should prevent updating space name', async () => {
      const updateData = {
        name: 'New Name', // Name changes not allowed
      };

      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app)
        .patch('/spaces/1')
        .send(updateData);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Space name cannot be changed');
    });
  });

  describe('DELETE /spaces/:id', () => {
    it('should delete space successfully by creator', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 1, // User is creator
        memberCount: 1,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const response = await request(app).delete('/spaces/1');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Space deleted successfully');
    });

    it('should prevent non-creators from deleting space', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 2, // Different user
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app).delete('/spaces/1');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only space creator can delete');
    });

    it('should prevent deleting spaces with many members', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 1,
        memberCount: 25, // Too many members
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app).delete('/spaces/1');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot delete space with many active members');
    });
  });

  describe('POST /spaces/:id/join', () => {
    it('should join public space successfully', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        isPrivate: false,
        memberCount: 10,
      };

      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingSpace]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]), // Not already a member
          }),
        });

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const response = await request(app).post('/spaces/1/join');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully joined space');
    });

    it('should prevent joining private space without invitation', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        isPrivate: true,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app).post('/spaces/1/join');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Cannot join private space');
    });

    it('should prevent joining if already a member', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        isPrivate: false,
      };

      const existingMembership = {
        spaceId: 1,
        user_id: 1,
      };

      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingSpace]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingMembership]),
          }),
        });

      const response = await request(app).post('/spaces/1/join');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Already a member of this space');
    });

    it('should handle space capacity limits', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        isPrivate: false,
        memberCount: 100, // At capacity
        maxMembers: 100,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app).post('/spaces/1/join');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Space is at maximum capacity');
    });
  });

  describe('POST /spaces/:id/leave', () => {
    it('should leave space successfully', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 2, // Different user, not creator
      };

      const existingMembership = {
        spaceId: 1,
        user_id: 1,
      };

      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingSpace]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingMembership]),
          }),
        });

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const response = await request(app).post('/spaces/1/leave');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully left space');
    });

    it('should prevent creator from leaving space', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 1, // User is creator
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([existingSpace]),
        }),
      });

      const response = await request(app).post('/spaces/1/leave');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Space creator cannot leave');
    });

    it('should handle non-member trying to leave', async () => {
      const existingSpace = {
        id: 1,
        organizationId: 1,
        createdBy: 2,
      };

      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([existingSpace]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]), // Not a member
          }),
        });

      const response = await request(app).post('/spaces/1/leave');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Not a member of this space');
    });
  });

  describe('GET /spaces/:id/members', () => {
    it('should return space members', async () => {
      const mockMembers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          department: 'Engineering',
          role: 'admin',
          joinedAt: new Date(),
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          department: 'Marketing',
          role: 'member',
          joinedAt: new Date(),
        },
      ];

      // Mock space access check
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ isMember: true }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockMembers),
              }),
            }),
          }),
        });

      const response = await request(app).get('/spaces/1/members');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('John Doe');
    });

    it('should prevent non-members from viewing private space members', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ 
              isPrivate: true, 
              isMember: false 
            }]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/1/members');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /spaces/:id/posts', () => {
    it('should return space posts', async () => {
      const mockPosts = [
        {
          id: 1,
          content: 'Welcome to the space!',
          authorId: 1,
          spaceId: 1,
          createdAt: new Date(),
          author: {
            name: 'John Doe',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
          commentCount: 3,
          likeCount: 5,
        },
      ];

      // Mock space access and posts
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ isMember: true }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue(mockPosts),
                  }),
                }),
              }),
            }),
          }),
        });

      const response = await request(app).get('/spaces/1/posts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('Welcome to the space!');
    });

    it('should handle pagination for posts', async () => {
      mockedDb.select = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ isMember: true }]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    offset: jest.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        });

      const response = await request(app)
        .get('/spaces/1/posts')
        .query({ page: '2', limit: '20' });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      const response = await request(app).get('/spaces');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });

    it('should validate space ID format', async () => {
      const response = await request(app).get('/spaces/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid space ID format');
    });
  });

  describe('Authorization', () => {
    it('should require authentication for all routes', async () => {
      mockedVerifyToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      const response = await request(app).get('/spaces');

      expect(response.status).toBe(401);
    });

    it('should enforce organization boundaries', async () => {
      const crossOrgSpace = {
        id: 1,
        organizationId: 2, // Different organization
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([crossOrgSpace]),
          }),
        }),
      });

      const response = await request(app).get('/spaces/1');

      expect(response.status).toBe(403);
    });
  });
});