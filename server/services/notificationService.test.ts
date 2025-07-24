import { NotificationService } from './notificationService';
import { storage } from '../storage';
import { EmailService } from './emailService';
import { io } from '../index';

jest.mock('../storage');
jest.mock('./emailService');
jest.mock('../index', () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
}));

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockEmailService = new EmailService() as jest.Mocked<EmailService>;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService(mockStorage, mockEmailService);
  });

  describe('createNotification', () => {
    it('should create notification and emit socket event', async () => {
      const notificationData = {
        userId: 1,
        type: 'recognition',
        title: 'New Recognition',
        message: 'You received recognition!',
        data: { points: 50 },
      };
      
      const createdNotification = {
        id: 100,
        ...notificationData,
        createdAt: new Date(),
        isRead: false,
      };
      
      mockStorage.createNotification.mockResolvedValue(createdNotification);

      const result = await notificationService.createNotification(notificationData);

      expect(result).toEqual(createdNotification);
      expect(io.to).toHaveBeenCalledWith(`user:1`);
      expect(io.emit).toHaveBeenCalledWith('notification', createdNotification);
    });

    it('should send email for important notifications', async () => {
      const notificationData = {
        userId: 1,
        type: 'leave_approved',
        title: 'Leave Approved',
        message: 'Your leave request has been approved',
        sendEmail: true,
      };
      
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        name: 'Test User',
      };
      
      mockStorage.getUser.mockResolvedValue(mockUser);
      mockStorage.createNotification.mockResolvedValue({ id: 100 });
      mockEmailService.sendEmail.mockResolvedValue(true);

      await notificationService.createNotification(notificationData);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: notificationData.title,
        })
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, title: 'Notification 1', isRead: false },
        { id: 2, userId: 1, title: 'Notification 2', isRead: true },
      ];
      
      mockStorage.getUserNotifications.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications(1);

      expect(result).toEqual(mockNotifications);
      expect(mockStorage.getUserNotifications).toHaveBeenCalledWith(1, 20, 0);
    });

    it('should support pagination', async () => {
      mockStorage.getUserNotifications.mockResolvedValue([]);

      await notificationService.getUserNotifications(1, 50, 100);

      expect(mockStorage.getUserNotifications).toHaveBeenCalledWith(1, 50, 100);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockStorage.markNotificationAsRead.mockResolvedValue({
        id: 1,
        isRead: true,
      });

      const result = await notificationService.markAsRead(1, 1);

      expect(result).toBe(true);
      expect(mockStorage.markNotificationAsRead).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockStorage.markAllNotificationsAsRead.mockResolvedValue(5);

      const result = await notificationService.markAllAsRead(1);

      expect(result).toBe(5);
      expect(io.to).toHaveBeenCalledWith(`user:1`);
      expect(io.emit).toHaveBeenCalledWith('notifications:allRead');
    });
  });

  describe('broadcastToOrganization', () => {
    it('should send notification to all organization users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com' },
        { id: 2, email: 'user2@test.com' },
        { id: 3, email: 'user3@test.com' },
      ];
      
      mockStorage.getUsers.mockResolvedValue(mockUsers);
      mockStorage.createNotification.mockResolvedValue({ id: 100 });

      const notification = {
        type: 'announcement',
        title: 'Company Update',
        message: 'Important announcement',
      };

      await notificationService.broadcastToOrganization(1, notification);

      expect(mockStorage.createNotification).toHaveBeenCalledTimes(3);
      expect(io.to).toHaveBeenCalledTimes(3);
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification for future', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      const notificationData = {
        userId: 1,
        type: 'reminder',
        title: 'Reminder',
        message: 'Don\'t forget!',
        scheduledFor: futureDate,
      };
      
      mockStorage.createScheduledNotification.mockResolvedValue({
        id: 100,
        ...notificationData,
        status: 'scheduled',
      });

      const result = await notificationService.scheduleNotification(notificationData);

      expect(result.status).toBe('scheduled');
      expect(mockStorage.createScheduledNotification).toHaveBeenCalled();
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process due scheduled notifications', async () => {
      const mockScheduled = [
        {
          id: 1,
          userId: 1,
          type: 'reminder',
          title: 'Reminder',
          message: 'Time to act!',
        },
      ];
      
      mockStorage.getDueScheduledNotifications.mockResolvedValue(mockScheduled);
      mockStorage.createNotification.mockResolvedValue({ id: 100 });
      mockStorage.updateScheduledNotificationStatus.mockResolvedValue(true);

      await notificationService.processScheduledNotifications();

      expect(mockStorage.createNotification).toHaveBeenCalledTimes(1);
      expect(mockStorage.updateScheduledNotificationStatus).toHaveBeenCalledWith(
        1,
        'sent'
      );
    });
  });
});