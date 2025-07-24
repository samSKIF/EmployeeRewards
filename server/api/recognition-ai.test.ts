import request from 'supertest';
import express from 'express';
import { router as recognitionAIRouter } from './recognition-ai';
import { storage } from '../storage';
import { verifyToken } from '../middleware/auth';
import OpenAI from 'openai';

jest.mock('../storage');
jest.mock('../middleware/auth');
jest.mock('openai');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

describe('Recognition AI API', () => {
  let app: express.Application;
  let mockOpenAI: jest.Mocked<OpenAI>;
  
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
    
    // Mock OpenAI
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);
    
    app.use('/api/recognition-ai', recognitionAIRouter);
  });

  describe('POST /api/recognition-ai/generate', () => {
    it('should generate recognition message with AI', async () => {
      const requestData = {
        recipientName: 'John Doe',
        reason: 'excellent teamwork',
        tone: 'professional',
        includeEmoji: true,
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '👏 Outstanding teamwork, John! Your collaboration skills are exceptional.',
          },
        }],
      } as any);

      const response = await request(app)
        .post('/api/recognition-ai/generate')
        .set('Authorization', 'Bearer test-token')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('John');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle different tones', async () => {
      const tones = ['casual', 'professional', 'enthusiastic', 'formal'];
      
      for (const tone of tones) {
        mockOpenAI.chat.completions.create.mockResolvedValue({
          choices: [{
            message: {
              content: `Recognition message in ${tone} tone`,
            },
          }],
        } as any);

        const response = await request(app)
          .post('/api/recognition-ai/generate')
          .set('Authorization', 'Bearer test-token')
          .send({
            recipientName: 'Jane Smith',
            reason: 'project completion',
            tone,
          });

        expect(response.status).toBe(200);
      }
    });

    it('should handle AI service errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI error'));

      const response = await request(app)
        .post('/api/recognition-ai/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          recipientName: 'Test User',
          reason: 'good work',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Failed to generate');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/recognition-ai/generate')
        .set('Authorization', 'Bearer test-token')
        .send({
          // Missing recipientName and reason
          tone: 'professional',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/recognition-ai/suggest-reasons', () => {
    it('should suggest recognition reasons based on context', async () => {
      const requestData = {
        recipientRole: 'Software Engineer',
        recentAchievements: ['Completed sprint goals', 'Helped new team member'],
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              'Exceptional sprint completion',
              'Outstanding mentorship',
              'Technical excellence',
              'Team collaboration',
            ]),
          },
        }],
      } as any);

      const response = await request(app)
        .post('/api/recognition-ai/suggest-reasons')
        .set('Authorization', 'Bearer test-token')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
  });

  describe('POST /api/recognition-ai/improve', () => {
    it('should improve existing recognition message', async () => {
      const requestData = {
        originalMessage: 'Good job on the project',
        improvements: ['more specific', 'add impact'],
      };
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Excellent work on the Phoenix project! Your innovative solution reduced processing time by 40% and will save the team hours each week.',
          },
        }],
      } as any);

      const response = await request(app)
        .post('/api/recognition-ai/improve')
        .set('Authorization', 'Bearer test-token')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.improvedMessage).toBeTruthy();
      expect(response.body.improvedMessage.length).toBeGreaterThan(
        requestData.originalMessage.length
      );
    });
  });

  describe('GET /api/recognition-ai/templates', () => {
    it('should return recognition templates', async () => {
      const mockTemplates = [
        {
          id: 1,
          category: 'teamwork',
          template: 'Great collaboration on {project}!',
          variables: ['project'],
        },
        {
          id: 2,
          category: 'innovation',
          template: 'Your innovative approach to {challenge} was inspiring!',
          variables: ['challenge'],
        },
      ];
      
      mockStorage.getRecognitionTemplates.mockResolvedValue(mockTemplates);

      const response = await request(app)
        .get('/api/recognition-ai/templates')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTemplates);
    });

    it('should filter templates by category', async () => {
      mockStorage.getRecognitionTemplates.mockResolvedValue([
        {
          id: 1,
          category: 'teamwork',
          template: 'Team template',
        },
      ]);

      const response = await request(app)
        .get('/api/recognition-ai/templates')
        .query({ category: 'teamwork' })
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(mockStorage.getRecognitionTemplates).toHaveBeenCalledWith('teamwork');
    });
  });

  describe('POST /api/recognition-ai/analyze-culture', () => {
    it('should analyze recognition culture for organization', async () => {
      const mockRecognitions = [
        { message: 'Great teamwork!', category: 'teamwork' },
        { message: 'Innovative solution!', category: 'innovation' },
        { message: 'Excellent leadership!', category: 'leadership' },
      ];
      
      mockStorage.getRecentRecognitions.mockResolvedValue(mockRecognitions);
      
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              topValues: ['teamwork', 'innovation', 'leadership'],
              recognitionFrequency: 'healthy',
              suggestions: ['Increase peer-to-peer recognition'],
            }),
          },
        }],
      } as any);

      const response = await request(app)
        .post('/api/recognition-ai/analyze-culture')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('topValues');
    });
  });
});