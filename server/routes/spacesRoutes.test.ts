import request from 'supertest';
import express from 'express';
import spacesRoutes from './spacesRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Spaces Routes', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    mockVerifyToken.mockImplementation((req: any, res, next) => {
      req.user = {
        id: 1,
        email: 'test@test.com',
        organizationId: 1,
      };
      next();
    });
    
    app.use('/api/spaces', spacesRoutes);
  });

  describe('GET /api/spaces', () => {
    it('should return all spaces for organization', async () => {
      const mockSpaces = [
        {
          id: 1,
          name: 'General Space',
          description: 'For everyone',
          memberCount: 50,
          isPublic: true,
        },
        {
          id: 2,
          name: 'Tech Team',
          description: 'Engineering discussions',
          memberCount: 15,
          isPublic: false,
        },
      ];
      
      mockStorage.getSpaces.mockResolvedValue(mockSpaces);

      const response = await request(app)
        .get('/api/spaces')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSpaces);
      expect(mockStorage.getSpaces).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /api/spaces/:id', () => {
    it('should return space details', async () => {
      const mockSpace = {
        id: 1,
        name: 'General Space',
        description: 'For everyone',
        organizationId: 1,
        members: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ],
        posts: [],
      };
      
      mockStorage.getSpaceDetails.mockResolvedValue(mockSpace);

      const response = await request(app)
        .get('/api/spaces/1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSpace);
    });

    it('should return 404 for non-existent space', async () => {
      mockStorage.getSpaceDetails.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/spaces/999')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
    });

    it('should prevent access to spaces from other organizations', async () => {
      mockStorage.getSpaceDetails.mockResolvedValue({
        id: 1,
        organizationId: 2, // Different org
      });

      const response = await request(app)
        .get('/api/spaces/1')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/spaces/:id/join', () => {
    it('should allow joining public space', async () => {
      mockStorage.getSpace.mockResolvedValue({
        id: 1,
        organizationId: 1,
        isPublic: true,
      });
      
      mockStorage.joinSpace.mockResolvedValue({
        spaceId: 1,
        userId: 1,
        joinedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/spaces/1/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should request approval for private space', async () => {
      mockStorage.getSpace.mockResolvedValue({
        id: 2,
        organizationId: 1,
        isPublic: false,
        requiresApproval: true,
      });
      
      mockStorage.requestSpaceAccess.mockResolvedValue({
        spaceId: 2,
        userId: 1,
        status: 'pending',
      });

      const response = await request(app)
        .post('/api/spaces/2/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approval');
    });
  });

  describe('POST /api/spaces/:id/leave', () => {
    it('should allow leaving space', async () => {
      mockStorage.leaveSpace.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/spaces/1/leave')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStorage.leaveSpace).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('GET /api/spaces/:id/members', () => {
    it('should return space members', async () => {
      const mockMembers = [
        { id: 1, name: 'User 1', role: 'admin' },
        { id: 2, name: 'User 2', role: 'member' },
      ];
      
      mockStorage.getSpaceMembers.mockResolvedValue(mockMembers);

      const response = await request(app)
        .get('/api/spaces/1/members')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMembers);
    });
  });

  describe('POST /api/spaces/:id/posts', () => {
    it('should create post in space', async () => {
      const postData = {
        content: 'Hello space members!',
      };
      
      mockStorage.isSpaceMember.mockResolvedValue(true);
      mockStorage.createSpacePost.mockResolvedValue({
        id: 100,
        content: postData.content,
        spaceId: 1,
        userId: 1,
      });

      const response = await request(app)
        .post('/api/spaces/1/posts')
        .set('Authorization', 'Bearer test-token')
        .send(postData);

      expect(response.status).toBe(201);
      expect(mockStorage.createSpacePost).toHaveBeenCalledWith({
        ...postData,
        spaceId: 1,
        userId: 1,
      });
    });

    it('should prevent non-members from posting', async () => {
      mockStorage.isSpaceMember.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/spaces/1/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Trying to post' });

      expect(response.status).toBe(403);
      expect(mockStorage.createSpacePost).not.toHaveBeenCalled();
    });
  });
});