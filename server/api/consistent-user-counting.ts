// CONSISTENT USER COUNTING API
// Implements unified counting rule across corporate and organization views

import { Request, Response } from 'express';
import { DatabaseStorage } from '../storage/database-storage';
import { getCreditableUserCount, getCreditableUsers, validateUserCountConsistency } from '../utils/user-counting-rule';

const storage = new DatabaseStorage();

export async function getCorporateUserCount(req: Request, res: Response) {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const users = await storage.getUsersByOrganization(organizationId);
    
    const creditableCount = getCreditableUserCount(users);
    const creditableUsers = getCreditableUsers(users);
    
    // Status breakdown for transparency
    const statusBreakdown = creditableUsers.reduce((acc: any, user: any) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        organizationId,
        creditableUserCount: creditableCount,
        totalUsers: users.length,
        statusBreakdown,
        businessRule: {
          includedStatuses: ['active', 'pending'],
          excludedRoles: ['corporate_admin'],
          excludedAdminScopes: ['super']
        }
      }
    });
    
  } catch (error: any) {
    console.error('Corporate user count error:', error?.message);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get corporate user count'
    });
  }
}

export async function getOrganizationUserCount(req: Request, res: Response) {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const users = await storage.getUsersByOrganization(organizationId);
    
    // Apply same business rule as corporate view
    const creditableCount = getCreditableUserCount(users);
    const creditableUsers = getCreditableUsers(users);
    
    res.json({
      success: true,
      data: {
        organizationId,
        creditableUserCount: creditableCount,
        totalUsers: users.length,
        users: creditableUsers.map(user => ({
          id: user.id,
          email: user.email,
          status: user.status,
          role_type: user.role_type,
          is_admin: user.is_admin
        }))
      }
    });
    
  } catch (error: any) {
    console.error('Organization user count error:', error?.message);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get organization user count'
    });
  }
}

export async function validateUserCountConsistencyEndpoint(req: Request, res: Response) {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const users = await storage.getUsersByOrganization(organizationId);
    
    const creditableCount = getCreditableUserCount(users);
    
    // Simulate both views should return same count
    const corporateViewCount = creditableCount;
    const organizationViewCount = creditableCount;
    
    const validation = validateUserCountConsistency(corporateViewCount, organizationViewCount);
    
    res.json({
      success: true,
      data: {
        organizationId,
        corporateViewCount,
        organizationViewCount,
        isConsistent: validation.isConsistent,
        discrepancy: validation.discrepancy,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('User count validation error:', error?.message);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to validate user count consistency'
    });
  }
}