/**
 * Recognition Microservice
 * Handles all recognition-related operations including settings, peer-to-peer recognition, and manager budgets
 */
import { db, pool } from '../../db';
import express, { Request, Response } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { 
  recognitionSettings, recognitions, managerBudgets, users, organizations,
  insertRecognitionSettingsSchema, insertRecognitionSchema, insertManagerBudgetSchema,
  type RecognitionSetting, type InsertRecognitionSetting,
  type ManagerBudget, type InsertManagerBudget
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

// Define extended interface for authenticated request user
interface RecognitionAuthRequest extends Omit<AuthenticatedRequest, 'user'> {
  user: {
    id: number;
    username: string;
    name: string;
    surname: string | null;
    email: string;
    organizationId: number;
    isAdmin: boolean;
    roleType: string;
    phoneNumber?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    [key: string]: any;
  }
}

const router = express.Router();

/**
 * Recognition Settings API endpoints
 */

// Get organization's recognition settings
router.get("/settings", verifyToken, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling get settings request');
    const { organizationId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    const settings = await db.query.recognitionSettings.findFirst({
      where: eq(recognitionSettings.organizationId, organizationId)
    });
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings: InsertRecognitionSetting = {
        organizationId,
        costPerPoint: 0.10,
        peerEnabled: true,
        peerRequiresApproval: true,
        peerPointsPerRecognition: 10,
        peerMaxRecognitionsPerMonth: 5,
        managerEnabled: true,
        managerRequiresApproval: false,
        createdBy: req.user.id
      };
      
      const [newSettings] = await db.insert(recognitionSettings)
        .values(defaultSettings)
        .returning();
        
      return res.status(200).json(newSettings);
    }
    
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error getting recognition settings:', error);
    return res.status(500).json({ error: 'Failed to get recognition settings' });
  }
});

// Update organization's recognition settings
router.put("/settings", verifyToken, verifyAdmin, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling update settings request');
    const { organizationId, id: userId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    // Validate input
    const result = insertRecognitionSettingsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid settings data', details: result.error.format() });
    }
    
    const settingsData = result.data;
    
    // Check if settings exist
    const existingSettings = await db.query.recognitionSettings.findFirst({
      where: eq(recognitionSettings.organizationId, organizationId)
    });
    
    if (!existingSettings) {
      // Create new settings
      const [newSettings] = await db.insert(recognitionSettings)
        .values({
          ...settingsData,
          organizationId,
          createdBy: userId,
          updatedBy: userId
        })
        .returning();
        
      return res.status(201).json(newSettings);
    }
    
    // Update existing settings
    const [updatedSettings] = await db.update(recognitionSettings)
      .set({
        ...settingsData,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(recognitionSettings.id, existingSettings.id))
      .returning();
      
    return res.status(200).json(updatedSettings);
  } catch (error) {
    console.error('Error updating recognition settings:', error);
    return res.status(500).json({ error: 'Failed to update recognition settings' });
  }
});

/**
 * Manager Budget API endpoints
 */

// Get all manager budgets for the organization
router.get("/manager-budgets", verifyToken, verifyAdmin, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling get manager budgets request');
    const { organizationId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
    const currentYear = now.getFullYear();
    
    // Get query params for month/year filtering
    const month = parseInt(req.query.month as string) || currentMonth;
    const year = parseInt(req.query.year as string) || currentYear;
    
    // Get list of managers (users with roleType containing 'manager')
    const managers = await db.query.users.findMany({
      where: and(
        eq(users.organizationId, organizationId),
        sql`${users.roleType} ILIKE '%manager%'`
      )
    });
    
    const managerIds = managers.map(manager => manager.id);
    
    if (managerIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Get budgets for all managers
    const budgets = await db.query.managerBudgets.findMany({
      where: and(
        eq(managerBudgets.organizationId, organizationId),
        eq(managerBudgets.month, month),
        eq(managerBudgets.year, year),
        inArray(managerBudgets.managerId, managerIds)
      ),
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            surname: true,
            email: true,
            jobTitle: true,
            department: true
          }
        }
      }
    });
    
    return res.status(200).json(budgets);
  } catch (error) {
    console.error('Error getting manager budgets:', error);
    return res.status(500).json({ error: 'Failed to get manager budgets' });
  }
});

// Update or create manager budget
router.post("/manager-budgets", verifyToken, verifyAdmin, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling update manager budget request');
    const { organizationId, id: userId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    const { managerId, totalPoints, month, year } = req.body;
    
    if (!managerId || !totalPoints || !month || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate manager belongs to organization
    const manager = await db.query.users.findFirst({
      where: and(
        eq(users.id, managerId),
        eq(users.organizationId, organizationId)
      )
    });
    
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found in this organization' });
    }
    
    // Check if budget already exists for this manager/month/year
    const existingBudget = await db.query.managerBudgets.findFirst({
      where: and(
        eq(managerBudgets.managerId, managerId),
        eq(managerBudgets.organizationId, organizationId),
        eq(managerBudgets.month, month),
        eq(managerBudgets.year, year)
      )
    });
    
    if (existingBudget) {
      // Update existing budget
      const [updatedBudget] = await db.update(managerBudgets)
        .set({
          totalPoints,
          remainingPoints: totalPoints - (existingBudget.totalPoints - existingBudget.remainingPoints),
          updatedAt: new Date()
        })
        .where(eq(managerBudgets.id, existingBudget.id))
        .returning();
        
      return res.status(200).json(updatedBudget);
    }
    
    // Create new budget
    const [newBudget] = await db.insert(managerBudgets)
      .values({
        managerId,
        organizationId,
        totalPoints,
        remainingPoints: totalPoints,
        month,
        year,
        createdBy: userId
      })
      .returning();
      
    return res.status(201).json(newBudget);
  } catch (error) {
    console.error('Error updating manager budget:', error);
    return res.status(500).json({ error: 'Failed to update manager budget' });
  }
});

/**
 * Export the router
 */
export default router;