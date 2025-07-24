import { Router } from 'express';
import { db } from '../../db';
import { employeeStatusTypes, employeeStatuses, users } from '@shared/schema';
import { and, eq, gte, lte, desc, isNull, or } from 'drizzle-orm';
import { AuthenticatedRequest, verifyToken } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();

// Apply authentication to all routes
router.use(verifyToken);

// Schema for status type validation
const statusTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  iconName: z.string().min(1, 'Icon name is required'),
  description: z.string().optional().nullable(),
  color: z.string().default('#6366F1'),
  durationDays: z.number().int().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Schema for assigning status to employee
const assignStatusSchema = z.object({
  userId: z.number().int(),
  statusTypeId: z.number().int(),
  startDate: z.string(), // Will be parsed as Date
  endDate: z.string().optional().nullable(), // Optional end date
  notes: z.string().optional().nullable(),
});

// Get all status types (for configuration)
router.get('/status-types', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to view status types' });
    }

    const statusTypes = await db
      .select()
      .from(employeeStatusTypes)
      .orderBy(employeeStatusTypes.name);

    res.status(200).json(statusTypes);
  } catch (error: any) {
    console.error('Error fetching status types:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to fetch status types' });
  }
});

// Create a new status type
router.post('/status-types', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to create status types' });
    }

    const validatedData = statusTypeSchema.parse(req.body);

    const [newStatusType] = await db
      .insert(employeeStatusTypes)
      .values({
        name: validatedData.name,
        iconName: validatedData.iconName,
        description: validatedData.description,
        color: validatedData.color,
        durationDays: validatedData.durationDays,
        isSystem: false,
        isActive: validatedData.isActive,
        createdBy: req.user.id,
        updatedAt: new Date(),
        organizationId: req.user.organizationId,
      })
      .returning();

    res.status(201).json(newStatusType);
  } catch (error: any) {
    console.error('Error creating status type:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to create status type' });
  }
});

// Update a status type
router.patch('/status-types/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to update status types' });
    }

    const statusTypeId = parseInt(req.params.id);
    const validatedData = statusTypeSchema.partial().parse(req.body);

    const [updatedStatusType] = await db
      .update(employeeStatusTypes)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(employeeStatusTypes.id, statusTypeId))
      .returning();

    if (!updatedStatusType) {
      return res.status(404).json({ message: 'Status type not found' });
    }

    res.status(200).json(updatedStatusType);
  } catch (error: any) {
    console.error('Error updating status type:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to update status type' });
  }
});

// Delete a status type
router.delete('/status-types/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to delete status types' });
    }

    const statusTypeId = parseInt(req.params.id);

    // Check if it's a system status type
    const [statusType] = await db
      .select()
      .from(employeeStatusTypes)
      .where(eq(employeeStatusTypes.id, statusTypeId));

    if (!statusType) {
      return res.status(404).json({ message: 'Status type not found' });
    }

    if (statusType.isSystem) {
      return res
        .status(403)
        .json({ message: 'Cannot delete system status types' });
    }

    // Delete the status type
    await db
      .delete(statusTypes)
      .where(eq(employeeStatusTypes.id, statusTypeId));

    res.status(200).json({ message: 'Status type deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting status type:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to delete status type' });
  }
});

// Get active employee statuses (for display)
router.get(
  '/users/:userId/statuses',
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const today = new Date();

      // Get current active statuses for this user
      const currentStatuses = await db
        .select({
          status: employeeStatuses,
          type: employeeStatusTypes,
        })
        .from(employeeStatuses)
        .innerJoin(
          employeeStatusTypes,
          eq(employeeStatuses.statusTypeId, employeeStatusTypes.id)
        )
        .where(
          and(
            eq(employeeStatuses.userId, userId),
            eq(employeeStatusTypes.isActive, true),
            lte(employeeStatuses.startDate, today),
            or(
              isNull(employeeStatuses.endDate),
              gte(employeeStatuses.endDate, today)
            )
          )
        )
        .orderBy(desc(employeeStatuses.createdAt));

      // Format the response
      const formattedStatuses = currentStatuses.map((item) => ({
        id: item.status.id,
        statusType: {
          id: item.type.id,
          name: item.type.name,
          iconName: item.type.iconName,
          color: item.type.color,
        },
        startDate: item.status.startDate,
        endDate: item.status.endDate,
        notes: item.status.notes,
      }));

      res.status(200).json(formattedStatuses);
    } catch (error: any) {
      console.error('Error fetching employee statuses:', error);
      res
        .status(500)
        .json({
          message: error.message || 'Failed to fetch employee statuses',
        });
    }
  }
);

// Assign status to an employee
router.post('/assign-status', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to assign statuses' });
    }

    const validatedData = assignStatusSchema.parse(req.body);

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId));

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if status type exists
    const [statusType] = await db
      .select()
      .from(employeeStatusTypes)
      .where(eq(employeeStatusTypes.id, validatedData.statusTypeId));

    if (!statusType) {
      return res.status(404).json({ message: 'Status type not found' });
    }

    // Calculate end date if duration is specified but end date is not
    let endDate = validatedData.endDate
      ? new Date(validatedData.endDate)
      : null;

    if (!endDate && statusType.durationDays) {
      const startDate = new Date(validatedData.startDate);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + statusType.durationDays);
    }

    // Create the status assignment
    const [newStatus] = await db
      .insert(employeeStatuses)
      .values({
        userId: validatedData.userId,
        statusTypeId: validatedData.statusTypeId,
        startDate: new Date(validatedData.startDate),
        endDate: endDate,
        notes: validatedData.notes,
        createdBy: req.user.id,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(newStatus);
  } catch (error: any) {
    console.error('Error assigning status:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to assign status' });
  }
});

// Remove a status from an employee
router.delete('/statuses/:id', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to remove statuses' });
    }

    const statusId = parseInt(req.params.id);

    // Check if status exists
    const [status] = await db
      .select()
      .from(employeeStatuses)
      .where(eq(employeeStatuses.id, statusId));

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // Delete the status
    await db.delete(employeeStatuses).where(eq(employeeStatuses.id, statusId));

    res.status(200).json({ message: 'Status removed successfully' });
  } catch (error: any) {
    console.error('Error removing status:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to remove status' });
  }
});

// Batch add statuses for events like birthdays or work anniversaries
router.post('/batch-assign', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not authorized to batch assign statuses' });
    }

    const { statusTypeId, userIds, startDate, endDate, notes } = req.body;

    if (!statusTypeId || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    // Check if status type exists
    const [statusType] = await db
      .select()
      .from(employeeStatusTypes)
      .where(eq(employeeStatusTypes.id, statusTypeId));

    if (!statusType) {
      return res.status(404).json({ message: 'Status type not found' });
    }

    // Calculate end date if duration is specified but end date is not
    let calculatedEndDate = endDate ? new Date(endDate) : null;

    if (!calculatedEndDate && statusType.durationDays) {
      const start = new Date(startDate);
      calculatedEndDate = new Date(start);
      calculatedEndDate.setDate(start.getDate() + statusType.durationDays);
    }

    // Create status assignments for all users
    const statusValues = userIds.map((userId) => ({
      userId,
      statusTypeId,
      startDate: new Date(startDate),
      endDate: calculatedEndDate,
      notes,
      createdBy: req.user.id,
      updatedAt: new Date(),
    }));

    const newStatuses = await db
      .insert(employeeStatuses)
      .values(statusValues)
      .returning();

    res.status(201).json(newStatuses);
  } catch (error: any) {
    console.error('Error batch assigning statuses:', error);
    res
      .status(500)
      .json({ message: error.message || 'Failed to batch assign statuses' });
  }
});

export default router;
