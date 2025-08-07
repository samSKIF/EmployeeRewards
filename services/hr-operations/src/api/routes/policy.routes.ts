// HR Policy Routes
import { Router } from 'express';
import { db } from '../../infrastructure/database/connection';
import { hrPolicies, insertHrPolicySchema } from '../../infrastructure/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

const router = Router();

// Get policies for organization
router.get('/organization/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const policies = await db
      .select()
      .from(hrPolicies)
      .where(
        and(
          eq(hrPolicies.organizationId, parseInt(organizationId)),
          eq(hrPolicies.isActive, true)
        )
      )
      .orderBy(desc(hrPolicies.createdAt));
    
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create policy
router.post('/', async (req, res) => {
  try {
    const validatedData = insertHrPolicySchema.parse(req.body);
    
    const [policy] = await db
      .insert(hrPolicies)
      .values(validatedData)
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'policy.created',
      source: 'hr-operations',
      data: policy
    });
    
    res.status(201).json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update policy
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [updated] = await db
      .update(hrPolicies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(hrPolicies.id, parseInt(id)))
      .returning();
    
    // Publish event
    eventBus.publish({
      type: 'policy.updated',
      source: 'hr-operations',
      data: updated
    });
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;