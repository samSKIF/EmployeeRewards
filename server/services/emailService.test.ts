import { EmailService } from './emailService';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail');

const mockSgMail = sgMail as jest.Mocked<typeof sgMail>;

describe('EmailService', () => {
  let emailService: EmailService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockSgMail.send.mockResolvedValue([{} as any, {}]);

      const emailData = {
        to: 'recipient@test.com',
        from: 'sender@test.com',
        subject: 'Test Email',
        text: 'Plain text content',
        html: '<p>HTML content</p>',
      };

      const result = await emailService.sendEmail(emailData);

      expect(result).toBe(true);
      expect(mockSgMail.send).toHaveBeenCalledWith(emailData);
    });

    it('should handle SendGrid errors', async () => {
      mockSgMail.send.mockRejectedValue(new Error('SendGrid error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await emailService.sendEmail({
        to: 'test@test.com',
        from: 'sender@test.com',
        subject: 'Test',
      });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with user data', async () => {
      mockSgMail.send.mockResolvedValue([{} as any, {}]);

      const userData = {
        email: 'newuser@test.com',
        name: 'New User',
        organizationName: 'Test Org',
      };

      await emailService.sendWelcomeEmail(userData);

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userData.email,
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining(userData.name),
        })
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email', async () => {
      mockSgMail.send.mockResolvedValue([{} as any, {}]);

      const resetData = {
        email: 'user@test.com',
        name: 'Test User',
        resetToken: 'reset-token-123',
      };

      await emailService.sendPasswordResetEmail(resetData);

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: resetData.email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining(resetData.resetToken),
        })
      );
    });
  });

  describe('sendRecognitionNotification', () => {
    it('should send recognition notification email', async () => {
      mockSgMail.send.mockResolvedValue([{} as any, {}]);

      const recognitionData = {
        recipientEmail: 'recipient@test.com',
        recipientName: 'John Doe',
        senderName: 'Jane Smith',
        message: 'Great job on the project!',
        points: 50,
      };

      await emailService.sendRecognitionNotification(recognitionData);

      expect(mockSgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recognitionData.recipientEmail,
          subject: expect.stringContaining('recognized'),
          html: expect.stringContaining(recognitionData.points.toString()),
        })
      );
    });
  });

  describe('sendBulkEmails', () => {
    it('should send multiple emails', async () => {
      mockSgMail.send.mockResolvedValue([{} as any, {}]);

      const recipients = [
        { email: 'user1@test.com', name: 'User 1' },
        { email: 'user2@test.com', name: 'User 2' },
      ];

      const template = {
        subject: 'Announcement',
        content: 'Important news',
      };

      await emailService.sendBulkEmails(recipients, template);

      expect(mockSgMail.send).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures', async () => {
      mockSgMail.send
        .mockResolvedValueOnce([{} as any, {}])
        .mockRejectedValueOnce(new Error('Failed'));

      const recipients = [
        { email: 'user1@test.com', name: 'User 1' },
        { email: 'user2@test.com', name: 'User 2' },
      ];

      const results = await emailService.sendBulkEmails(recipients, {
        subject: 'Test',
        content: 'Test content',
      });

      expect(results.successful).toBe(1);
      expect(results.failed).toBe(1);
    });
  });
});