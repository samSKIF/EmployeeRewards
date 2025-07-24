import { CelebrationPostService } from './celebrationPostService';
import { storage } from '../storage';

jest.mock('../storage');

const mockStorage = storage as jest.Mocked<typeof storage>;

describe('CelebrationPostService', () => {
  let service: CelebrationPostService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new CelebrationPostService();
  });

  describe('generateCelebrationPosts', () => {
    it('should generate birthday posts for today\'s birthdays', async () => {
      const today = new Date('2025-01-24');
      jest.useFakeTimers().setSystemTime(today);
      
      const mockBirthdayUsers = [
        {
          id: 1,
          name: 'John Doe',
          birthDate: '1990-01-24',
          organizationId: 1,
        },
      ];
      
      mockStorage.getTodaysBirthdayUsers.mockResolvedValue(mockBirthdayUsers);
      mockStorage.checkExistingCelebrationPost.mockResolvedValue(false);
      mockStorage.createPost.mockResolvedValue({
        id: 100,
        content: 'Birthday celebration post',
      });

      await service.generateCelebrationPosts();

      expect(mockStorage.getTodaysBirthdayUsers).toHaveBeenCalled();
      expect(mockStorage.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('🎉'),
          isCelebration: true,
          celebrationType: 'birthday',
        })
      );
      
      jest.useRealTimers();
    });

    it('should generate anniversary posts for work anniversaries', async () => {
      const today = new Date('2025-01-24');
      jest.useFakeTimers().setSystemTime(today);
      
      const mockAnniversaryUsers = [
        {
          id: 2,
          name: 'Jane Smith',
          hireDate: '2022-01-24',
          organizationId: 1,
        },
      ];
      
      mockStorage.getTodaysBirthdayUsers.mockResolvedValue([]);
      mockStorage.getTodaysAnniversaryUsers.mockResolvedValue(mockAnniversaryUsers);
      mockStorage.checkExistingCelebrationPost.mockResolvedValue(false);
      mockStorage.createPost.mockResolvedValue({
        id: 101,
        content: 'Anniversary celebration post',
      });

      await service.generateCelebrationPosts();

      expect(mockStorage.getTodaysAnniversaryUsers).toHaveBeenCalled();
      expect(mockStorage.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('🎊'),
          isCelebration: true,
          celebrationType: 'anniversary',
          anniversaryYears: 3,
        })
      );
      
      jest.useRealTimers();
    });

    it('should skip if celebration post already exists', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        birthDate: '1990-01-24',
        organizationId: 1,
      };
      
      mockStorage.getTodaysBirthdayUsers.mockResolvedValue([mockUser]);
      mockStorage.checkExistingCelebrationPost.mockResolvedValue(true);

      await service.generateCelebrationPosts();

      expect(mockStorage.checkExistingCelebrationPost).toHaveBeenCalledWith(
        1,
        'birthday',
        expect.any(Date)
      );
      expect(mockStorage.createPost).not.toHaveBeenCalled();
    });

    it('should handle users without celebrations', async () => {
      mockStorage.getTodaysBirthdayUsers.mockResolvedValue([]);
      mockStorage.getTodaysAnniversaryUsers.mockResolvedValue([]);

      await service.generateCelebrationPosts();

      expect(mockStorage.createPost).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockStorage.getTodaysBirthdayUsers.mockRejectedValue(new Error('Database error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.generateCelebrationPosts();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error generating celebration posts'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('formatCelebrationMessage', () => {
    it('should format birthday message with proper tags', () => {
      const user = {
        id: 1,
        name: 'John Doe',
        organizationId: 1,
      };
      
      const message = service.formatBirthdayMessage(user);
      
      expect(message).toContain('🎉');
      expect(message).toContain('@John Doe');
      expect(message).toContain('#Birthday');
    });

    it('should format anniversary message with years', () => {
      const user = {
        id: 2,
        name: 'Jane Smith',
        organizationId: 1,
      };
      
      const message = service.formatAnniversaryMessage(user, 5);
      
      expect(message).toContain('🎊');
      expect(message).toContain('@Jane Smith');
      expect(message).toContain('5 years');
      expect(message).toContain('#WorkAnniversary');
    });

    it('should use correct ordinal for anniversary years', () => {
      expect(service.formatAnniversaryMessage({ name: 'Test' }, 1)).toContain('1st year');
      expect(service.formatAnniversaryMessage({ name: 'Test' }, 2)).toContain('2nd year');
      expect(service.formatAnniversaryMessage({ name: 'Test' }, 3)).toContain('3rd year');
      expect(service.formatAnniversaryMessage({ name: 'Test' }, 4)).toContain('4th year');
      expect(service.formatAnniversaryMessage({ name: 'Test' }, 21)).toContain('21st year');
    });
  });
});