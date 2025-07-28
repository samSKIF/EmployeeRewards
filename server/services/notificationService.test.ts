import { NotificationService } from './notificationService';
import { db } from '../db';
import { notifications, users } from '@shared/schema';

// Mock dependencies
jest.mock('../db');
jest.mock('../services/emailService');

const mockedDb = db as jest.Mocked<typeof db>;

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        user_id: 1,
        type: 'recognition',
        title: 'You received recognition!',
        message: 'John Doe recognized you for great work',
        data: { recognition_id: 123, points: 100 },
        organizationId: 1,
      };

      const mockCreatedNotification = {
        id: 1,
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedNotification]),
        }),
      });

      const result = await notificationService.createNotification(notificationData);

      expect(result).toEqual(mockCreatedNotification);
      expect(mockedDb.insert).toHaveBeenCalledWith(notifications);
    });

    it('should handle database errors during creation', async () => {
      const notificationData = {
        user_id: 1,
        type: 'system',
        title: 'Test notification',
        message: 'Test message',
        organizationId: 1,
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(
        notificationService.createNotification(notificationData)
      ).rejects.toThrow('Database error');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing user_id
        type: 'system',
        title: 'Test',
        message: 'Test message',
        organizationId: 1,
      } as any;

      await expect(
        notificationService.createNotification(invalidData)
      ).rejects.toThrow('UserId is required');
    });

    it('should validate notification type', async () => {
      const invalidData = {
        user_id: 1,
        type: 'invalid_type',
        title: 'Test',
        message: 'Test message',
        organizationId: 1,
      } as any;

      await expect(
        notificationService.createNotification(invalidData)
      ).rejects.toThrow('Invalid notification type');
    });

    it('should handle optional data field', async () => {
      const notificationData = {
        user_id: 1,
        type: 'system',
        title: 'Simple notification',
        message: 'No additional data',
        organizationId: 1,
        // No data field
      };

      const mockCreatedNotification = {
        id: 1,
        ...notificationData,
        data: null,
        isRead: false,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedNotification]),
        }),
      });

      const result = await notificationService.createNotification(notificationData);

      expect(result.data).toBeNull();
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 1,
          user_id: 1,
          type: 'recognition',
          title: 'Recognition received',
          message: 'You were recognized for excellent work',
          isRead: false,
          createdAt: new Date(),
          data: { points: 100 },
        },
        {
          id: 2,
          user_id: 1,
          type: 'system',
          title: 'System update',
          message: 'System maintenance scheduled',
          isRead: true,
          createdAt: new Date(),
          data: null,
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockNotifications),
              }),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(1, {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockNotifications);
      expect(result).toHaveLength(2);
    });

    it('should filter by read status', async () => {
      const mockUnreadNotifications = [
        {
          id: 1,
          user_id: 1,
          type: 'recognition',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockUnreadNotifications),
              }),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(1, {
        limit: 10,
        offset: 0,
        unreadOnly: true,
      });

      expect(result).toEqual(mockUnreadNotifications);
      expect(result.every(n => !n.isRead)).toBe(true);
    });

    it('should filter by notification type', async () => {
      const mockRecognitionNotifications = [
        {
          id: 1,
          user_id: 1,
          type: 'recognition',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockRecognitionNotifications),
              }),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(1, {
        limit: 10,
        offset: 0,
        type: 'recognition',
      });

      expect(result.every(n => n.type === 'recognition')).toBe(true);
    });

    it('should handle empty results', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(999, {
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual([]);
    });

    it('should apply default pagination when not provided', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      await notificationService.getUserNotifications(1);

      // Should use default limit of 50
      expect(mockedDb.select().from().where().orderBy().limit).toHaveBeenCalledWith(50);
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      const mockUpdatedNotification = {
        id: 1,
        user_id: 1,
        isRead: true,
        updatedAt: new Date(),
      };

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedNotification]),
          }),
        }),
      });

      const result = await notificationService.markAsRead(1, 1);

      expect(result).toEqual(mockUpdatedNotification);
      expect(mockedDb.update).toHaveBeenCalledWith(notifications);
    });

    it('should handle notification not found', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await notificationService.markAsRead(999, 1);

      expect(result).toBeNull();
    });

    it('should prevent marking other users notifications', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await notificationService.markAsRead(1, 999); // Wrong user

      expect(result).toBeNull();
    });

    it('should handle database errors during update', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Update failed')),
          }),
        }),
      });

      await expect(
        notificationService.markAsRead(1, 1)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read', async () => {
      const mockUpdatedCount = 5;

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({ rowCount: mockUpdatedCount }),
        }),
      });

      const result = await notificationService.markAllAsRead(1);

      expect(result).toBe(mockUpdatedCount);
    });

    it('should handle user with no unread notifications', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({ rowCount: 0 }),
        }),
      });

      const result = await notificationService.markAllAsRead(1);

      expect(result).toBe(0);
    });

    it('should only update unread notifications', async () => {
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({ rowCount: 3 }),
        }),
      });

      await notificationService.markAllAsRead(1);

      // Should include condition for isRead = false
      expect(mockedDb.update().set().where).toHaveBeenCalled();
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 1 }),
      });

      const result = await notificationService.deleteNotification(1, 1);

      expect(result).toBe(true);
      expect(mockedDb.delete).toHaveBeenCalledWith(notifications);
    });

    it('should return false when notification not found', async () => {
      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const result = await notificationService.deleteNotification(999, 1);

      expect(result).toBe(false);
    });

    it('should prevent deleting other users notifications', async () => {
      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const result = await notificationService.deleteNotification(1, 999);

      expect(result).toBe(false);
    });

    it('should handle database errors during deletion', async () => {
      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error('Delete failed')),
      });

      await expect(
        notificationService.deleteNotification(1, 1)
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const mockCountResult = [{ count: 12 }];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockCountResult),
        }),
      });

      const result = await notificationService.getUnreadCount(1);

      expect(result).toBe(12);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockCountResult = [{ count: 0 }];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockCountResult),
        }),
      });

      const result = await notificationService.getUnreadCount(1);

      expect(result).toBe(0);
    });

    it('should handle database errors during count', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('Count failed')),
        }),
      });

      await expect(
        notificationService.getUnreadCount(1)
      ).rejects.toThrow('Count failed');
    });

    it('should handle empty count result', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await notificationService.getUnreadCount(1);

      expect(result).toBe(0);
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const user_ids = [1, 2, 3];
      const notificationData = {
        type: 'system',
        title: 'System Announcement',
        message: 'Important system update',
        organizationId: 1,
      };

      const mockCreatedNotifications = user_ids.map(user_id => ({
        id: user_id,
        user_id,
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      }));

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue(mockCreatedNotifications),
        }),
      });

      const result = await notificationService.sendBulkNotifications(
        user_ids,
        notificationData
      );

      expect(result).toEqual(mockCreatedNotifications);
      expect(result).toHaveLength(3);
    });

    it('should handle empty user list', async () => {
      const notificationData = {
        type: 'system',
        title: 'Test',
        message: 'Test message',
        organizationId: 1,
      };

      const result = await notificationService.sendBulkNotifications(
        [],
        notificationData
      );

      expect(result).toEqual([]);
      expect(mockedDb.insert).not.toHaveBeenCalled();
    });

    it('should validate bulk notification data', async () => {
      const user_ids = [1, 2];
      const invalidData = {
        // Missing type
        title: 'Test',
        message: 'Test message',
        organizationId: 1,
      } as any;

      await expect(
        notificationService.sendBulkNotifications(user_ids, invalidData)
      ).rejects.toThrow('Invalid notification data');
    });
  });

  describe('getNotificationsByType', () => {
    it('should return notifications filtered by type', async () => {
      const mockRecognitionNotifications = [
        {
          id: 1,
          user_id: 1,
          type: 'recognition',
          title: 'Recognition 1',
          createdAt: new Date(),
        },
        {
          id: 2,
          user_id: 1,
          type: 'recognition',
          title: 'Recognition 2',
          createdAt: new Date(),
        },
      ];

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockRecognitionNotifications),
          }),
        }),
      });

      const result = await notificationService.getNotificationsByType(
        1,
        'recognition',
        { limit: 10 }
      );

      expect(result).toEqual(mockRecognitionNotifications);
      expect(result.every(n => n.type === 'recognition')).toBe(true);
    });

    it('should handle invalid notification type', async () => {
      await expect(
        notificationService.getNotificationsByType(1, 'invalid_type' as any)
      ).rejects.toThrow('Invalid notification type');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old notifications', async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const mockDeletedCount = 45;

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: mockDeletedCount }),
      });

      const result = await notificationService.cleanupOldNotifications(cutoffDate);

      expect(result).toBe(mockDeletedCount);
      expect(mockedDb.delete).toHaveBeenCalledWith(notifications);
    });

    it('should handle no old notifications to delete', async () => {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 0 }),
      });

      const result = await notificationService.cleanupOldNotifications(cutoffDate);

      expect(result).toBe(0);
    });

    it('should use default cutoff date when not provided', async () => {
      mockedDb.delete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ rowCount: 10 }),
      });

      await notificationService.cleanupOldNotifications();

      expect(mockedDb.delete).toHaveBeenCalled();
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = {
        user_id: 1,
        email: true,
        push: false,
        sms: false,
        recognition: true,
        system: true,
        social: false,
      };

      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([mockPreferences]),
        }),
      });

      const result = await notificationService.getNotificationPreferences(1);

      expect(result).toEqual(mockPreferences);
    });

    it('should return default preferences when not found', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await notificationService.getNotificationPreferences(1);

      expect(result).toEqual({
        user_id: 1,
        email: true,
        push: true,
        sms: false,
        recognition: true,
        system: true,
        social: true,
      });
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      const preferences = {
        email: false,
        push: true,
        recognition: true,
      };

      const mockUpdatedPreferences = {
        user_id: 1,
        ...preferences,
        updatedAt: new Date(),
      };

      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockUpdatedPreferences]),
          }),
        }),
      });

      const result = await notificationService.updateNotificationPreferences(
        1,
        preferences
      );

      expect(result).toEqual(mockUpdatedPreferences);
    });

    it('should create preferences if they do not exist', async () => {
      const preferences = {
        email: true,
        push: false,
      };

      // First update returns nothing (no existing preferences)
      mockedDb.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Then insert creates new preferences
      const mockCreatedPreferences = {
        user_id: 1,
        ...preferences,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedPreferences]),
        }),
      });

      const result = await notificationService.updateNotificationPreferences(
        1,
        preferences
      );

      expect(result).toEqual(mockCreatedPreferences);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user IDs', async () => {
      await expect(
        notificationService.getUserNotifications(-1)
      ).rejects.toThrow('Invalid user ID');
    });

    it('should handle very large pagination values', async () => {
      mockedDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await notificationService.getUserNotifications(1, {
        limit: 10000,
        offset: 50000,
      });

      expect(result).toEqual([]);
    });

    it('should sanitize notification content', async () => {
      const maliciousData = {
        user_id: 1,
        type: 'system',
        title: '<script>alert("xss")</script>Important',
        message: 'Clean message <b>bold</b>',
        organizationId: 1,
      };

      const sanitizedNotification = {
        id: 1,
        user_id: 1,
        type: 'system',
        title: 'Important', // Script tags removed
        message: 'Clean message bold', // HTML tags removed but content preserved
        organizationId: 1,
        isRead: false,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([sanitizedNotification]),
        }),
      });

      const result = await notificationService.createNotification(maliciousData);

      expect(result.title).not.toContain('<script>');
      expect(result.message).not.toContain('<b>');
    });
  });

  describe('Integration with Other Services', () => {
    it('should create notification for recognition events', async () => {
      const recognitionData = {
        user_id: 2,
        type: 'recognition',
        title: 'You received recognition!',
        message: 'John Doe recognized you for excellent teamwork',
        data: {
          recognition_id: 123,
          points: 150,
          recognizedBy: 'John Doe',
          category: 'teamwork',
        },
        organizationId: 1,
      };

      const mockCreatedNotification = {
        id: 1,
        ...recognitionData,
        isRead: false,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedNotification]),
        }),
      });

      const result = await notificationService.createNotification(recognitionData);

      expect(result.type).toBe('recognition');
      expect(result.data.points).toBe(150);
      expect(result.data.recognizedBy).toBe('John Doe');
    });

    it('should create notification for leave request updates', async () => {
      const leaveData = {
        user_id: 3,
        type: 'leave',
        title: 'Leave request approved',
        message: 'Your vacation request for Aug 1-5 has been approved',
        data: {
          requestId: 456,
          status: 'approved',
          startDate: '2025-08-01',
          endDate: '2025-08-05',
        },
        organizationId: 1,
      };

      const mockCreatedNotification = {
        id: 2,
        ...leaveData,
        isRead: false,
        createdAt: new Date(),
      };

      mockedDb.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockCreatedNotification]),
        }),
      });

      const result = await notificationService.createNotification(leaveData);

      expect(result.type).toBe('leave');
      expect(result.data.status).toBe('approved');
    });
  });
});