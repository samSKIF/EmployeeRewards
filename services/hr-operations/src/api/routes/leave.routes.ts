// Leave Management Routes
import { Router } from 'express';
import { db } from '../../infrastructure/database/connection';
import { leaveRequests, leaveEntitlements, insertLeaveRequestSchema } from '../../infrastructure/database/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

const router = Router();

// Get leave requests for an employee
router.get('/requests/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const requests = await db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, parseInt(employeeId)))
      .orderBy(desc(leaveRequests.createdAt));
    
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create leave request
router.post('/requests', async (req, res) => {
  try {
    const validatedData = insertLeaveRequestSchema.parse(req.body);
    
    const [request] = await db
      .insert(leaveRequests)
      .values(validatedData)
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'leave.request_submitted',
      source: 'hr-operations',
      data: request
    });
    
    res.status(201).json(request);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Approve/reject leave request
router.patch('/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approverId, approverComments } = req.body;
    
    const [updated] = await db
      .update(leaveRequests)
      .set({
        status,
        approverId,
        approverComments,
        approvedAt: status === 'approved' ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(leaveRequests.id, parseInt(id)))
      .returning();
    
    // Publish event
    const eventType = status === 'approved' ? 'leave.request_approved' : 'leave.request_rejected';
    eventBus.publish({
      type: eventType,
      source: 'hr-operations',
      data: updated
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get leave entitlements
router.get('/entitlements/:employeeId/:year', async (req, res) => {
  try {
    const { employeeId, year } = req.params;
    const entitlements = await db
      .select()
      .from(leaveEntitlements)
      .where(
        and(
          eq(leaveEntitlements.employeeId, parseInt(employeeId)),
          eq(leaveEntitlements.year, parseInt(year))
        )
      );
    
    res.json(entitlements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update leave balance
router.patch('/entitlements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { usedDays } = req.body;
    
    const [current] = await db
      .select()
      .from(leaveEntitlements)
      .where(eq(leaveEntitlements.id, parseInt(id)));
    
    if (!current) {
      return res.status(404).json({ error: 'Entitlement not found' });
    }
    
    const remainingDays = current.entitledDays - usedDays;
    
    const [updated] = await db
      .update(leaveEntitlements)
      .set({
        usedDays,
        remainingDays,
        updatedAt: new Date()
      })
      .where(eq(leaveEntitlements.id, parseInt(id)))
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'leave.balance_updated',
      source: 'hr-operations',
      data: updated
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;