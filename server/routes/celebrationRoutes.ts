import { Router } from 'express';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@shared/logger';

const router = Router();

// Get today's celebrations (birthdays and work anniversaries)
router.get('/today', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get company ID from admin's email domain
    const domain = currentUser.email.split('@')[1];
    const domainToCompanyMap: Record<string, number> = {
      'canva.com': 1,
      'monday.com': 2,
      'loylogic.com': 3,
      'fripl.com': 4,
      'democorp.com': 5,
    };
    const companyId = domainToCompanyMap[domain] || null;

    if (!companyId) {
      return res.json([]);
    }

    // Get users with birthdays today from the same organization
    const birthdayUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, companyId),
          sql`${users.birthDate} IS NOT NULL`,
          sql`EXTRACT(MONTH FROM ${users.birthDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          sql`EXTRACT(DAY FROM ${users.birthDate}) = EXTRACT(DAY FROM CURRENT_DATE)`
        )
      );

    // Get users with work anniversaries today from the same organization
    const anniversaryUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, companyId),
          sql`${users.hireDate} IS NOT NULL`,
          sql`EXTRACT(MONTH FROM ${users.hireDate}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
          sql`EXTRACT(DAY FROM ${users.hireDate}) = EXTRACT(DAY FROM CURRENT_DATE)`
        )
      );

    const todayDate = new Date();

    logger.debug('Birthday users found:', birthdayUsers.length);
    logger.debug('Anniversary users found:', anniversaryUsers.length);

    const celebrations = [
      ...birthdayUsers.map((employee) => ({
        id: employee.id,
        user: {
          id: employee.id,
          name: employee.name,
          surname: employee.surname,
          avatarUrl: employee.avatarUrl,
          department: employee.department,
          location: employee.location,
          birthDate: employee.birthDate,
          hireDate: employee.hireDate,
          jobTitle: employee.jobTitle,
        },
        type: 'birthday',
        date: todayDate.toISOString().split('T')[0],
        hasReacted: false,
        hasCommented: false,
      })),
      ...anniversaryUsers.map((employee) => {
        const years = employee.hireDate
          ? new Date().getFullYear() - new Date(employee.hireDate).getFullYear()
          : 0;
        return {
          id: employee.id,
          user: {
            id: employee.id,
            name: employee.name,
            surname: employee.surname,
            avatarUrl: employee.avatarUrl,
            department: employee.department,
            location: employee.location,
            birthDate: employee.birthDate,
            hireDate: employee.hireDate,
            jobTitle: employee.jobTitle,
          },
          type: 'work_anniversary',
          date: todayDate.toISOString().split('T')[0],
          yearsOfService: years,
          hasReacted: false,
          hasCommented: false,
        };
      }),
    ];

    logger.debug('Total celebrations returning:', celebrations.length);
    res.json(celebrations);
  } catch (error) {
    logger.error("Error fetching today's celebrations:", error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

// Get upcoming celebrations (next 3 days)
router.get('/upcoming', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const organizationId = currentUser.organizationId;
    if (!organizationId) {
      return res.json([]);
    }

    const celebrations = [];

    // Check next 3 days for upcoming celebrations
    for (let i = 1; i <= 3; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();

      // Get birthday celebrants for this date
      const birthdayUsers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.organizationId, organizationId),
            sql`${users.birthDate} IS NOT NULL`,
            sql`EXTRACT(MONTH FROM ${users.birthDate}) = ${month}`,
            sql`EXTRACT(DAY FROM ${users.birthDate}) = ${day}`
          )
        );

      // Get anniversary celebrants for this date
      const anniversaryUsers = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.organizationId, organizationId),
            sql`${users.hireDate} IS NOT NULL`,
            sql`EXTRACT(MONTH FROM ${users.hireDate}) = ${month}`,
            sql`EXTRACT(DAY FROM ${users.hireDate}) = ${day}`
          )
        );

      // Add birthday celebrations
      celebrations.push(
        ...birthdayUsers.map((employee) => ({
          id: `birthday-${employee.id}-${targetDate.toISOString().split('T')[0]}`,
          user: {
            id: employee.id,
            name: employee.name,
            surname: employee.surname,
            avatarUrl: employee.avatarUrl,
            department: employee.department,
            location: employee.location,
            birthDate: employee.birthDate,
            hireDate: employee.hireDate,
            jobTitle: employee.jobTitle,
          },
          type: 'birthday',
          date: targetDate.toISOString().split('T')[0],
          hasReacted: false,
          hasCommented: false,
        }))
      );

      // Add anniversary celebrations
      celebrations.push(
        ...anniversaryUsers.map((employee) => {
          const years = employee.hireDate
            ? targetDate.getFullYear() -
              new Date(employee.hireDate).getFullYear()
            : 0;
          return {
            id: `anniversary-${employee.id}-${targetDate.toISOString().split('T')[0]}`,
            user: {
              id: employee.id,
              name: employee.name,
              surname: employee.surname,
              avatarUrl: employee.avatarUrl,
              department: employee.department,
              location: employee.location,
              birthDate: employee.birthDate,
              hireDate: employee.hireDate,
              jobTitle: employee.jobTitle,
            },
            type: 'work_anniversary',
            date: targetDate.toISOString().split('T')[0],
            yearsOfService: years,
            hasReacted: false,
            hasCommented: false,
          };
        })
      );
    }

    // Sort by date
    celebrations.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json(celebrations);
  } catch (error) {
    logger.error('Error fetching upcoming celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming celebrations' });
  }
});

// GET /api/celebrations/extended - Get extended celebrations (last 5 days + today + next 5 days)
router.get('/extended', verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { department, location } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    logger.info('Extended celebrations API called', {
      department,
      location,
      organizationId,
    });

    const celebrations = [];

    // Check last 3 days, today, and next 3 days
    for (let i = -3; i <= 3; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);
      const month = targetDate.getMonth() + 1;
      const day = targetDate.getDate();

      // Build birthday query conditions
      const birthdayConditions = [
        sql`${users.birthDate} IS NOT NULL`,
        sql`EXTRACT(MONTH FROM ${users.birthDate}) = ${month}`,
        sql`EXTRACT(DAY FROM ${users.birthDate}) = ${day}`,
        eq(users.organizationId, organizationId),
      ];

      // Add department filter if specified
      if (department && department !== 'all') {
        birthdayConditions.push(eq(users.department, department as string));
      }

      // Add location filter if specified
      if (location && location !== 'all') {
        birthdayConditions.push(eq(users.location, location as string));
      }

      // Fetch birthday celebrants for this date
      const birthdayUsers = await db
        .select()
        .from(users)
        .where(and(...birthdayConditions));

      // Build anniversary query conditions
      const anniversaryConditions = [
        sql`${users.hireDate} IS NOT NULL`,
        sql`EXTRACT(MONTH FROM ${users.hireDate}) = ${month}`,
        sql`EXTRACT(DAY FROM ${users.hireDate}) = ${day}`,
        eq(users.organizationId, organizationId),
      ];

      // Add department filter if specified
      if (department && department !== 'all') {
        anniversaryConditions.push(eq(users.department, department as string));
      }

      // Add location filter if specified
      if (location && location !== 'all') {
        anniversaryConditions.push(eq(users.location, location as string));
      }

      // Fetch anniversary celebrants for this date
      const anniversaryUsers = await db
        .select()
        .from(users)
        .where(and(...anniversaryConditions));

      // Add birthday celebrations
      celebrations.push(
        ...birthdayUsers.map((employee) => ({
          id: `birthday-${employee.id}-${targetDate.toISOString().split('T')[0]}`,
          user: {
            id: employee.id,
            name: employee.name,
            surname: employee.surname,
            avatarUrl: employee.avatarUrl,
            department: employee.department,
            location: employee.location,
            birthDate: employee.birthDate,
            hireDate: employee.hireDate,
            jobTitle: employee.jobTitle,
          },
          type: 'birthday',
          date: targetDate.toISOString().split('T')[0],
          hasReacted: false,
          hasCommented: false,
        }))
      );

      // Add anniversary celebrations
      celebrations.push(
        ...anniversaryUsers.map((employee) => {
          const years = employee.hireDate
            ? targetDate.getFullYear() -
              new Date(employee.hireDate).getFullYear()
            : 0;
          return {
            id: `anniversary-${employee.id}-${targetDate.toISOString().split('T')[0]}`,
            user: {
              id: employee.id,
              name: employee.name,
              surname: employee.surname,
              avatarUrl: employee.avatarUrl,
              department: employee.department,
              location: employee.location,
              birthDate: employee.birthDate,
              hireDate: employee.hireDate,
              jobTitle: employee.jobTitle,
            },
            type: 'work_anniversary',
            date: targetDate.toISOString().split('T')[0],
            yearsOfService: years,
            hasReacted: false,
            hasCommented: false,
          };
        })
      );
    }

    // Sort by date
    celebrations.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    logger.info(
      `Extended celebrations: Found ${celebrations.length} celebrations`
    );
    res.json(celebrations);
  } catch (error) {
    logger.error('Error fetching extended celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch extended celebrations' });
  }
});

export default router;
