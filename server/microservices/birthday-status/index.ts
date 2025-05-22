/**
 * Birthday Status Microservice
 * Automatically assigns birthday status to employees on their birthday
 */

import { Request, Response } from 'express';
import { db } from '../../db';
import { employees, employeeStatusTypes, employeeStatuses } from '../../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken } from '../../middleware/auth';

// Check and assign birthday statuses for all employees
export async function checkBirthdayStatuses(req: Request, res: Response) {
  try {
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];

    // Find all employees whose birthday is today (month and day match)
    const employeesWithBirthday = await db
      .select()
      .from(employees)
      .where(and(
        sql`EXTRACT(MONTH FROM birth_date) = ${today.getMonth() + 1}`,
        sql`EXTRACT(DAY FROM birth_date) = ${today.getDate()}`
      ));

    // Get the Birthday status type
    const birthdayStatusType = await db
      .select()
      .from(employeeStatusTypes)
      .where(eq(employeeStatusTypes.name, 'Birthday'))
      .limit(1);

    if (birthdayStatusType.length === 0) {
      return res.status(404).json({ error: 'Birthday status type not found' });
    }

    const statusTypeId = birthdayStatusType[0].id;

    // Check each employee and assign birthday status if not already assigned today
    for (const employee of employeesWithBirthday) {
      // Check if employee already has birthday status for today
      const existingStatus = await db
        .select()
        .from(employeeStatuses)
        .where(and(
          eq(employeeStatuses.userId, employee.id),
          eq(employeeStatuses.statusTypeId, statusTypeId),
          eq(employeeStatuses.startDate, todayFormatted)
        ));

      if (existingStatus.length === 0) {
        // Assign birthday status for today only
        await db
          .insert(employeeStatuses)
          .values({
            userId: employee.id,
            statusTypeId: statusTypeId,
            startDate: todayFormatted,
            endDate: todayFormatted,
            notes: 'Happy Birthday! 🎉',
            createdBy: 1, // System
            updatedAt: new Date()
          });
      }
    }

    res.json({ 
      message: 'Birthday statuses checked and assigned',
      employeesProcessed: employeesWithBirthday.length
    });
  } catch (error) {
    console.error('Error checking birthday statuses:', error);
    res.status(500).json({ error: 'Failed to check birthday statuses' });
  }
}

// Manual birthday status assignment
export async function assignBirthdayStatus(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { date } = req.body;

    // Get the Birthday status type
    const birthdayStatusType = await db
      .select()
      .from(employeeStatusTypes)
      .where(eq(employeeStatusTypes.name, 'Birthday'))
      .limit(1);

    if (birthdayStatusType.length === 0) {
      return res.status(404).json({ error: 'Birthday status type not found' });
    }

    const statusTypeId = birthdayStatusType[0].id;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Assign birthday status
    const newStatus = await db
      .insert(employeeStatuses)
      .values({
        userId: parseInt(userId),
        statusTypeId: statusTypeId,
        startDate: targetDate,
        endDate: targetDate,
        notes: 'Happy Birthday! 🎉',
        createdBy: req.user?.id || 1,
        updatedAt: new Date()
      })
      .returning();

    res.json(newStatus[0]);
  } catch (error) {
    console.error('Error assigning birthday status:', error);
    res.status(500).json({ error: 'Failed to assign birthday status' });
  }
}

// Setup routes
export function setupBirthdayStatusRoutes(app: any) {
  app.post('/api/birthday-status/check', verifyToken, checkBirthdayStatuses);
  app.post('/api/birthday-status/assign/:userId', verifyToken, assignBirthdayStatus);
}