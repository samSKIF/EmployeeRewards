// Holiday Calendar Routes
import { Router } from 'express';
import { db } from '../../infrastructure/database/connection';
import { holidays, insertHolidaySchema } from '../../infrastructure/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

const router = Router();

// Get holidays for organization
router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { year } = req.query;
    
    let query = db
      .select()
      .from(holidays)
      .where(eq(holidays.organizationId, parseInt(organizationId)));
    
    const result = await query;
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create holiday
router.post('/', async (req, res) => {
  try {
    const validatedData = insertHolidaySchema.parse(req.body);
    
    const [holiday] = await db
      .insert(holidays)
      .values(validatedData)
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'holiday.created',
      source: 'hr-operations',
      data: holiday
    });
    
    res.status(201).json(holiday);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete holiday
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db
      .delete(holidays)
      .where(eq(holidays.id, parseInt(id)));
    
    // Publish event
    eventBus.publish({
      type: 'holiday.deleted',
      source: 'hr-operations',
      data: { holidayId: id }
    });
    
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;