/**
 * Celebration Post Service
 * Automatically generates social posts for birthdays and work anniversaries
 */
import { db, pool } from '../db';
import { users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@shared/logger';

interface CelebrationUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  avatarUrl?: string;
  department: string;
  jobTitle: string;
  organizationId: number;
  birthDate: string;
  hireDate: string;
}

class CelebrationPostService {
  /**
   * Get the organization admin user (first admin user in the organization)
   */
  private async getOrganizationAdmin(
    organizationId: number
  ): Promise<{ id: number; name: string } | null> {
    try {
      const query = `
        SELECT id, name
        FROM users 
        WHERE organization_id = $1 
          AND (is_admin = true OR role_type LIKE '%admin%')
        ORDER BY created_at ASC
        LIMIT 1
      `;

      const result = await pool.query(query, [organizationId]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      logger.warn(`No admin user found for organization ${organizationId}`);
      return null;
    } catch (error) {
      logger.error('Error getting organization admin:', error);
      return null;
    }
  }

  /**
   * Check if a celebration post already exists for this user and date
   */
  private async celebrationPostExists(
    user_id: number,
    celebrationType: string,
    date: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT id FROM posts 
        WHERE type = 'celebration' 
          AND content LIKE '%#celebration_%'
          AND content LIKE '%user_id:${user_id}%'
          AND content LIKE '%type:${celebrationType}%'
          AND DATE(created_at) = $1
      `;

      const result = await pool.query(query, [date]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking celebration post existence:', error);
      return false;
    }
  }

  /**
   * Generate celebration post content with proper tagging
   */
  private generateCelebrationContent(
    user: CelebrationUser,
    type: 'birthday' | 'work_anniversary',
    yearsOfService?: number
  ): string {
    const fullName = `${user.name} ${user.surname || ''}`.trim();

    if (type === 'birthday') {
      const messages = [
        `🎉 Happy Birthday to ${fullName}! 🎂 Wishing you a fantastic day filled with joy and celebration! 🎈`,
        `🎂 It's ${fullName}'s special day! 🎉 Hope your birthday is as amazing as you are! 🌟`,
        `🎈 Birthday wishes to our wonderful team member ${fullName}! 🎂 Have a fantastic celebration! 🎉`,
        `🎉 Celebrating ${fullName} today! 🎂 Wishing you happiness, success, and cake! 🎈`,
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];
      return `${message}\n\n#celebration_birthday #team #birthday #user_id:${user.id} #type:birthday`;
    } else {
      const yearText = yearsOfService
        ? `${yearsOfService} amazing ${yearsOfService === 1 ? 'year' : 'years'}`
        : 'another year';

      const messages = [
        `🎊 Congratulations to ${fullName} on ${yearText} with our team! 🏆 Thank you for your dedication and hard work! 💪`,
        `🌟 Celebrating ${fullName}'s work anniversary! 🎊 ${yearText.charAt(0).toUpperCase() + yearText.slice(1)} of excellence and commitment! 🚀`,
        `🏆 ${fullName} is celebrating ${yearText} with us today! 🎊 We're grateful for your contributions to our team! 🌟`,
        `🎉 Work anniversary celebration for ${fullName}! 🏆 ${yearText.charAt(0).toUpperCase() + yearText.slice(1)} of making a difference! 💼`,
      ];

      const message = messages[Math.floor(Math.random() * messages.length)];
      return `${message}\n\n#celebration_anniversary #team #workanniversary #user_id:${user.id} #type:work_anniversary`;
    }
  }

  /**
   * Create a celebration post
   */
  private async createCelebrationPost(
    adminUserId: number,
    content: string,
    celebratingUserId: number
  ): Promise<boolean> {
    try {
      const query = `
        INSERT INTO posts (user_id, content, type, tags, created_at, updated_at)
        VALUES ($1, $2, 'celebration', ARRAY[$3, $4, $5], NOW(), NOW())
        RETURNING id
      `;

      const result = await pool.query(query, [
        adminUserId,
        content,
        'celebration',
        'team',
        `user:${celebratingUserId}`,
      ]);

      if (result.rows.length > 0) {
        logger.info(
          `Celebration post created successfully (ID: ${result.rows[0].id}) for user ${celebratingUserId} by admin ${adminUserId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error creating celebration post:', error);
      return false;
    }
  }

  /**
   * Get today's birthdays for all organizations
   */
  private async getTodaysBirthdays(): Promise<CelebrationUser[]> {
    try {
      const query = `
        SELECT id, name, surname, email, avatar_url as "avatarUrl", 
               department, job_title as "jobTitle", organization_id as "organizationId",
               birth_date as "birthDate", hire_date as "hireDate"
        FROM users 
        WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
          AND birth_date IS NOT NULL
          AND status = 'active'
        ORDER BY organization_id, name
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Error getting today's birthdays:", error);
      return [];
    }
  }

  /**
   * Get today's work anniversaries for all organizations
   */
  private async getTodaysAnniversaries(): Promise<CelebrationUser[]> {
    try {
      const query = `
        SELECT id, name, surname, email, avatar_url as "avatarUrl", 
               department, job_title as "jobTitle", organization_id as "organizationId",
               birth_date as "birthDate", hire_date as "hireDate"
        FROM users 
        WHERE EXTRACT(MONTH FROM hire_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(DAY FROM hire_date) = EXTRACT(DAY FROM CURRENT_DATE)
          AND hire_date IS NOT NULL
          AND hire_date < CURRENT_DATE  -- Must have been hired before today
          AND status = 'active'
        ORDER BY organization_id, name
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      logger.error("Error getting today's anniversaries:", error);
      return [];
    }
  }

  /**
   * Calculate years of service
   */
  private calculateYearsOfService(hireDate: string): number {
    const hire = new Date(hireDate);
    const now = new Date();
    return now.getFullYear() - hire.getFullYear();
  }

  /**
   * Generate celebration posts for today's birthdays and anniversaries
   */
  async generateTodaysCelebrationPosts(): Promise<void> {
    try {
      logger.info('Starting celebration post generation for today...');

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

      // Get today's birthdays
      const birthdayUsers = await this.getTodaysBirthdays();
      logger.info(
        `Found ${birthdayUsers.length} birthday celebrations for today`
      );

      // Get today's anniversaries
      const anniversaryUsers = await this.getTodaysAnniversaries();
      logger.info(
        `Found ${anniversaryUsers.length} work anniversary celebrations for today`
      );

      // Process birthdays
      for (const user of birthdayUsers) {
        try {
          // Check if post already exists
          if (await this.celebrationPostExists(user.id, 'birthday', today)) {
            logger.info(
              `Birthday post already exists for user ${user.id} (${user.name})`
            );
            continue;
          }

          // Get organization admin
          const admin = await this.getOrganizationAdmin(user.organization_id);
          if (!admin) {
            logger.warn(
              `No admin found for organization ${user.organization_id}, skipping birthday post for ${user.name}`
            );
            continue;
          }

          // Generate and create post
          const content = this.generateCelebrationContent(user, 'birthday');
          const success = await this.createCelebrationPost(
            admin.id,
            content,
            user.id
          );

          if (success) {
            logger.info(
              `Birthday celebration post created for ${user.name} (${user.email})`
            );
          } else {
            logger.error(
              `Failed to create birthday post for ${user.name} (${user.email})`
            );
          }
        } catch (error) {
          logger.error(`Error processing birthday for user ${user.id}:`, error);
        }
      }

      // Process anniversaries
      for (const user of anniversaryUsers) {
        try {
          // Check if post already exists
          if (
            await this.celebrationPostExists(user.id, 'work_anniversary', today)
          ) {
            logger.info(
              `Anniversary post already exists for user ${user.id} (${user.name})`
            );
            continue;
          }

          // Get organization admin
          const admin = await this.getOrganizationAdmin(user.organization_id);
          if (!admin) {
            logger.warn(
              `No admin found for organization ${user.organization_id}, skipping anniversary post for ${user.name}`
            );
            continue;
          }

          // Calculate years of service
          const yearsOfService = this.calculateYearsOfService(user.hire_date);

          // Generate and create post
          const content = this.generateCelebrationContent(
            user,
            'work_anniversary',
            yearsOfService
          );
          const success = await this.createCelebrationPost(
            admin.id,
            content,
            user.id
          );

          if (success) {
            logger.info(
              `Work anniversary celebration post created for ${user.name} (${user.email}) - ${yearsOfService} years`
            );
          } else {
            logger.error(
              `Failed to create anniversary post for ${user.name} (${user.email})`
            );
          }
        } catch (error) {
          logger.error(
            `Error processing anniversary for user ${user.id}:`,
            error
          );
        }
      }

      logger.info('Celebration post generation completed');
    } catch (error) {
      logger.error('Error in generateTodaysCelebrationPosts:', error);
    }
  }

  /**
   * Manual trigger for celebration posts (for testing or admin use)
   */
  async generateCelebrationPostsForUser(
    user_id: number,
    type: 'birthday' | 'work_anniversary'
  ): Promise<boolean> {
    try {
      // Get user details
      const userQuery = `
        SELECT id, name, surname, email, avatar_url as "avatarUrl", 
               department, job_title as "jobTitle", organization_id as "organizationId",
               birth_date as "birthDate", hire_date as "hireDate"
        FROM users WHERE id = $1
      `;

      const userResult = await pool.query(userQuery, [user_id]);
      if (userResult.rows.length === 0) {
        logger.error(`User not found: ${user_id}`);
        return false;
      }

      const user = userResult.rows[0];

      // Get organization admin
      const admin = await this.getOrganizationAdmin(user.organization_id);
      if (!admin) {
        logger.error(`No admin found for organization ${user.organization_id}`);
        return false;
      }

      // Generate content
      const yearsOfService =
        type === 'work_anniversary'
          ? this.calculateYearsOfService(user.hire_date)
          : undefined;
      const content = this.generateCelebrationContent(
        user,
        type,
        yearsOfService
      );

      // Create post
      return await this.createCelebrationPost(admin.id, content, user.id);
    } catch (error) {
      logger.error('Error in generateCelebrationPostsForUser:', error);
      return false;
    }
  }
}

export const celebrationPostService = new CelebrationPostService();
