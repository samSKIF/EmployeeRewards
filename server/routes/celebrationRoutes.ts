import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "@shared/logger";

const router = Router();

// Get today's celebrations (birthdays and work anniversaries)
router.get("/today", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get company ID from admin's email domain
    const domain = currentUser.email.split('@')[1];
    const domainToCompanyMap: Record<string, number> = {
      'canva.com': 1,
      'monday.com': 2, 
      'loylogic.com': 3,
      'fripl.com': 4,
      'democorp.com': 5
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
      ...birthdayUsers.map(employee => ({
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
          jobTitle: employee.jobTitle
        },
        type: 'birthday',
        date: todayDate.toISOString().split('T')[0],
        hasReacted: false,
        hasCommented: false
      })),
      ...anniversaryUsers.map(employee => {
        const years = employee.hireDate ? new Date().getFullYear() - new Date(employee.hireDate).getFullYear() : 0;
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
            jobTitle: employee.jobTitle
          },
          type: 'work_anniversary',
          date: todayDate.toISOString().split('T')[0],
          yearsOfService: years,
          hasReacted: false,
          hasCommented: false
        };
      })
    ];

    logger.debug('Total celebrations returning:', celebrations.length);
    res.json(celebrations);
  } catch (error) {
    logger.error('Error fetching today\'s celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch celebrations' });
  }
});

// Get upcoming celebrations (next 30 days)
router.get("/upcoming", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.user;
    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get company ID from admin's email domain
    const domain = currentUser.email.split('@')[1];
    const domainToCompanyMap: Record<string, number> = {
      'canva.com': 1,
      'monday.com': 2, 
      'loylogic.com': 3,
      'fripl.com': 4,
      'democorp.com': 5
    };
    const companyId = domainToCompanyMap[domain] || null;

    if (!companyId) {
      return res.json([]);
    }

    // Simplified birthday query to avoid date function issues
    const upcomingBirthdays = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, companyId),
          sql`${users.birthDate} IS NOT NULL`
        )
      )
      .limit(10);

    // Simplified anniversary query 
    const upcomingAnniversaries = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, companyId),
          sql`${users.hireDate} IS NOT NULL`
        )
      )
      .limit(10);

    const celebrations = [
      ...upcomingBirthdays.map(employee => ({
        id: `birthday-${employee.id}`,
        user: {
          id: employee.id,
          name: employee.name,
          surname: employee.surname,
          avatarUrl: employee.avatarUrl,
          department: employee.department,
          location: employee.location,
          birthDate: employee.birthDate,
          hireDate: employee.hireDate,
          jobTitle: employee.jobTitle
        },
        type: 'birthday',
        date: employee.birthDate,
        hasReacted: false,
        hasCommented: false
      })),
      ...upcomingAnniversaries.map(employee => {
        const years = employee.hireDate ? new Date().getFullYear() - new Date(employee.hireDate).getFullYear() : 0;
        return {
          id: `anniversary-${employee.id}`,
          user: {
            id: employee.id,
            name: employee.name,
            surname: employee.surname,
            avatarUrl: employee.avatarUrl,
            department: employee.department,
            location: employee.location,
            birthDate: employee.birthDate,
            hireDate: employee.hireDate,
            jobTitle: employee.jobTitle
          },
          type: 'work_anniversary',
          date: employee.hireDate,
          yearsOfService: years + 1, // Next anniversary
          hasReacted: false,
          hasCommented: false
        };
      })
    ];

    res.json(celebrations);
  } catch (error) {
    logger.error('Error fetching upcoming celebrations:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming celebrations' });
  }
});

export default router;