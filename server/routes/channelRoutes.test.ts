import request from 'supertest';
import express from 'express';
import channelRoutes from './channelRoutes';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';

jest.mock('../storage');
jest.mock('../middleware/auth');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Channel Routes (Spaces)', () => {
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
    
    app.use('/api/channels', channelRoutes);
  });

  describe('GET /api/channels', () => {
    it('should return user channels/spaces', async () => {
      const mockChannels = [
        {
          id: 1,
          name: 'General',
          description: 'General discussion',
          memberCount: 25,
          isJoined: true,
        },
        {
          id: 2,
          name: 'Engineering',
          description: 'Tech team space',
          memberCount: 10,
          isJoined: false,
        },
      ];
      
      mockStorage.getUserChannels.mockResolvedValue(mockChannels);

      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockChannels);
      expect(mockStorage.getUserChannels).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('POST /api/channels', () => {
    it('should create new channel/space', async () => {
      const newChannelData = {
        name: 'Marketing',
        description: 'Marketing team space',
        isPrivate: false,
      };
      
      const createdChannel = {
        id: 3,
        ...newChannelData,
        createdBy: 1,
        organizationId: 1,
      };
      
      mockStorage.createChannel.mockResolvedValue(createdChannel);

      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', 'Bearer test-token')
        .send(newChannelData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(createdChannel);
      expect(mockStorage.createChannel).toHaveBeenCalledWith({
        ...newChannelData,
        createdBy: 1,
        organizationId: 1,
      });
    });

    it('should validate channel name', async () => {
      const response = await request(app)
        .post('/api/channels')
        .set('Authorization', 'Bearer test-token')
        .send({
          // Missing name
          description: 'Test channel',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/channels/:id/join', () => {
    it('should allow user to join channel', async () => {
      mockStorage.joinChannel.mockResolvedValue({
        user_id: 1,
        channelId: 2,
        joinedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/channels/2/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStorage.joinChannel).toHaveBeenCalledWith(1, 2);
    });

    it('should handle already joined', async () => {
      mockStorage.joinChannel.mockRejectedValue(new Error('Already a member'));

      const response = await request(app)
        .post('/api/channels/2/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/channels/:id/leave', () => {
    it('should allow user to leave channel', async () => {
      mockStorage.leaveChannel.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/channels/2/leave')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockStorage.leaveChannel).toHaveBeenCalledWith(1, 2);
    });
  });

  describe('GET /api/channels/:id/posts', () => {
    it('should return channel posts', async () => {
      const mockPosts = [
        {
          id: 1,
          content: 'Welcome to the channel!',
          user_id: 1,
          channelId: 2,
          createdAt: new Date(),
        },
      ];
      
      mockStorage.getChannelPosts.mockResolvedValue(mockPosts);

      const response = await request(app)
        .get('/api/channels/2/posts')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPosts);
    });
  });

  describe('GET /api/channels/suggestions', () => {
    it('should return suggested channels to join', async () => {
      const mockSuggestions = [
        {
          id: 4,
          name: 'Product Updates',
          description: 'Latest product news',
          memberCount: 50,
        },
      ];
      
      mockStorage.getSuggestedChannels.mockResolvedValue(mockSuggestions);

      const response = await request(app)
        .get('/api/channels/suggestions')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSuggestions);
      expect(mockStorage.getSuggestedChannels).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Multi-tenant channel isolation', () => {
    it('should only return channels from user\'s organization', async () => {
      const mockChannels = [
        { id: 1, organizationId: 1, name: 'Org 1 Channel' },
      ];
      
      mockStorage.getUserChannels.mockResolvedValue(mockChannels);

      const response = await request(app)
        .get('/api/channels')
        .set('Authorization', 'Bearer test-token');

      // Verify it queries with the user's organizationId
      expect(mockStorage.getUserChannels).toHaveBeenCalledWith(1, 1);
    });

    it('should prevent joining channels from other organizations', async () => {
      // Mock channel from different org
      mockStorage.getChannel.mockResolvedValue({
        id: 99,
        organizationId: 2, // Different org
      });

      mockStorage.joinChannel.mockRejectedValue(new Error('Access denied'));

      const response = await request(app)
        .post('/api/channels/99/join')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(500);
    });
  });
});