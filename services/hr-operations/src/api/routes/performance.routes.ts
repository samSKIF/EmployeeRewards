// Performance Review Routes
import { Router } from 'express';
import { db } from '../../infrastructure/database/connection';
import { performanceReviews, insertPerformanceReviewSchema } from '../../infrastructure/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

const router = Router();

// Get performance reviews for an employee
router.get('/reviews/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const reviews = await db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.employeeId, parseInt(employeeId)))
      .orderBy(desc(performanceReviews.createdAt));
    
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create performance review
router.post('/reviews', async (req, res) => {
  try {
    const validatedData = insertPerformanceReviewSchema.parse(req.body);
    
    const [review] = await db
      .insert(performanceReviews)
      .values(validatedData)
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'performance.review_created',
      source: 'hr-operations',
      data: review
    });
    
    res.status(201).json(review);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update performance review
router.patch('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updated] = await db
      .update(performanceReviews)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(performanceReviews.id, parseInt(id)))
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'performance.review_updated',
      source: 'hr-operations',
      data: updated
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Complete performance review
router.post('/reviews/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [completed] = await db
      .update(performanceReviews)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(performanceReviews.id, parseInt(id)))
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'performance.review_completed',
      source: 'hr-operations',
      data: completed
    });
    
    res.json(completed);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;