/**
 * Recognition Microservice
 * Handles all recognition-related operations including settings, peer-to-peer recognition, and manager budgets
 */
import { db, pool } from '../../db';
import express, { Request, Response } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { storage } from '../../storage';
import { Server } from 'socket.io';
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

// WebSocket instance for real-time notifications
let io: Server | null = null;

// Function to set WebSocket instance from main server
export function setWebSocketInstance(socketInstance: Server) {
  io = socketInstance;
}

// Function to emit recognition notifications
function notifyNewRecognition(recognition: any) {
  if (io) {
    io.emit('newRecognition', recognition);
  }
}

function notifyPointsUpdate(userId: number, points: number) {
  if (io) {
    io.to(`user_${userId}`).emit('pointsUpdate', { points });
  }
}

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
 * Peer-to-Peer Recognition API endpoints
 */

// Create a peer recognition
router.post("/peer", verifyToken, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling peer recognition request');
    const { id: userId, organizationId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    const { recipientId, badgeType, message, points } = req.body;
    
    if (!recipientId || !badgeType || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate recipient exists and belongs to the same organization
    const recipient = await db.query.users.findFirst({
      where: and(
        eq(users.id, recipientId),
        eq(users.organizationId, organizationId)
      )
    });
    
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found in this organization' });
    }
    
    // Don't allow self-recognition
    if (userId === recipientId) {
      return res.status(400).json({ error: 'You cannot recognize yourself' });
    }
    
    // Check settings
    const settings = await db.query.recognitionSettings.findFirst({
      where: eq(recognitionSettings.organizationId, organizationId)
    });
    
    if (!settings || !settings.peerEnabled) {
      return res.status(403).json({ error: 'Peer-to-peer recognition is not enabled for your organization' });
    }
    
    try {
      // Create recognition with points - this will handle all validation and transactions
      const { recognition, transaction } = await storage.createPeerRecognitionWithPoints(
        userId,
        recipientId,
        points || settings.peerPointsPerRecognition,
        badgeType,
        message
      );
      
      // Create a recognition post
      const post = await storage.createRecognitionPost(
        userId,
        {
          content: message,
          type: "recognition"
        },
        {
          recognizerId: userId,
          recipientId,
          badgeType,
          points: recognition.points,
          message
        }
      );
      
      // Notify via WebSocket
      notifyNewRecognition({ ...recognition, post: post.post });
      notifyPointsUpdate(recipientId, (recipient as any).points + recognition.points);
      
      return res.status(201).json({
        recognition,
        transaction,
        post: post.post
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Error creating peer recognition:', error);
    return res.status(500).json({ error: 'Failed to create peer recognition' });
  }
});

// Get user's sent recognitions
router.get("/sent", verifyToken, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling get sent recognitions request');
    const { id: userId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    const recognitions = await storage.getUserRecognitionsGiven(userId);
    return res.status(200).json(recognitions);
  } catch (error) {
    console.error('Error getting sent recognitions:', error);
    return res.status(500).json({ error: 'Failed to get sent recognitions' });
  }
});

// Get user's received recognitions
router.get("/received", verifyToken, async (req: RecognitionAuthRequest, res) => {
  try {
    console.log('Recognition microservice: Handling get received recognitions request');
    const { id: userId } = req.user;
    // Mark request as handled by microservice to prevent duplicate processing
    (req as any)._routeHandledByMicroservice = true;
    
    const recognitions = await storage.getUserRecognitionsReceived(userId);
    return res.status(200).json(recognitions);
  } catch (error) {
    console.error('Error getting received recognitions:', error);
    return res.status(500).json({ error: 'Failed to get received recognitions' });
  }
});

/**
 * Export the router
 */
export default router;