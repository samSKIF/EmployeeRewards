import { Router } from 'express';
import { verifyToken, verifyAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { storage } from '../../storage';
import { logger } from '@shared/logger';
import { activityLogger, logActivity, auditLogger } from '../../middleware/activityLogger';

const router = Router();

/**
 * Enterprise Audit Routes - Addressing Audit Findings
 * 
 * Provides comprehensive audit trails for enterprise operations including:
 * - Organization management with full activity tracking
 * - Feature toggle monitoring with compliance logging
 * - Subscription change tracking with audit trails
 * - Corporate admin action monitoring
 * - Enterprise-level compliance reporting
 */

// Get comprehensive organization audit trail
router.get('/organizations/:id/audit', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'view_organization_audit', resource_type: 'organization' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const { 
      start_date, 
      end_date, 
      action_types,
      limit = 100, 
      offset = 0 
    } = req.query;

    // Verify admin access to this organization
    if (req.user?.organization_id !== organizationId && req.user?.admin_scope !== 'site') {
      if (req.user?.id && req.user?.organization_id) {
        await logActivity(req, 'organization_audit_access_denied', 'organization', organizationId, {
          denial_reason: 'insufficient_permissions',
          user_org: req.user.organization_id,
          requested_org: organizationId,
          admin_scope: req.user.admin_scope,
        });
      }
      return res.status(403).json({ message: 'Access denied to organization audit' });
    }

    // Get comprehensive audit trail for organization
    const auditTrail = await storage.getOrganizationAuditTrail(organizationId, {
      startDate: start_date as string,
      endDate: end_date as string,
      actionTypes: action_types ? (action_types as string).split(',') : undefined,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    // Log audit access for compliance
    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req, 'view_organization_audit', 'organization', organizationId, {
        audit_scope: { start_date, end_date, action_types },
        records_retrieved: auditTrail.length,
        accessed_by_admin: req.user.id,
        access_timestamp: new Date().toISOString(),
      });
    }

    res.json({
      organization_id: organizationId,
      audit_trail: auditTrail,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: auditTrail.length,
      },
      filters: { start_date, end_date, action_types },
      meta: {
        accessed_by: req.user?.id,
        access_time: new Date().toISOString(),
        compliance_note: 'full_audit_trail_accessed',
      }
    });

  } catch (error: any) {
    logger.error('Organization audit retrieval failed:', { 
      error, 
      organizationId: req.params.id,
      adminId: req.user?.id,
    });

    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req as any, 'organization_audit_error', 'organization', parseInt(req.params.id), {
        error_type: error?.message || 'unknown_error',
        failure_context: 'audit_retrieval_failed',
      });
    }

    res.status(500).json({ message: 'Failed to retrieve organization audit trail' });
  }
});

// Track organization feature toggle changes
router.post('/organizations/:id/features/:feature/toggle', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'toggle_organization_feature', resource_type: 'organization_feature' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const featureName = req.params.feature;
    const { enabled, reason } = req.body;

    // Verify admin access
    if (req.user?.organization_id !== organizationId && req.user?.admin_scope !== 'site') {
      if (req.user?.id && req.user?.organization_id) {
        await logActivity(req as any, 'feature_toggle_denied', 'organization_feature', organizationId, {
          denial_reason: 'insufficient_permissions',
          feature_name: featureName,
          attempted_state: enabled,
        });
      }
      return res.status(403).json({ message: 'Access denied to modify organization features' });
    }

    // Get current feature state for audit trail
    const currentOrg = await storage.getOrganizationById(organizationId);
    const currentFeatureState = currentOrg?.features?.[featureName];

    // Update feature state
    const updatedOrg = await storage.updateOrganizationFeature(organizationId, featureName, enabled);

    // Create comprehensive audit log for feature toggle
    await auditLogger(
      req.user?.id,
      organizationId,
      'FEATURE_TOGGLE',
      'organization_features',
      organizationId,
      { [featureName]: currentFeatureState },
      { [featureName]: enabled },
      req
    );

    // Log detailed feature toggle activity
    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req as any, 'toggle_organization_feature', 'organization_feature', organizationId, {
      feature_name: featureName,
      previous_state: currentFeatureState,
      new_state: enabled,
      change_reason: reason,
      organization_name: currentOrg?.name,
      toggled_by_admin: req.user?.id,
      compliance_required: true,
      impact_assessment: {
        affects_users: true,
        requires_notification: enabled !== currentFeatureState,
      },
      });
    }

    res.json({
      organization_id: organizationId,
      feature: featureName,
      previous_state: currentFeatureState,
      new_state: enabled,
      reason: reason,
      updated_by: req.user?.id,
      updated_at: new Date().toISOString(),
      audit_trail: {
        action: 'feature_toggle',
        compliance_logged: true,
      }
    });

  } catch (error: any) {
    logger.error('Feature toggle failed:', { 
      error, 
      organizationId: req.params.id,
      feature: req.params.feature,
      adminId: req.user?.id,
    });

    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req as any, 'feature_toggle_error', 'organization_feature', parseInt(req.params.id), {
        error_type: error?.message || 'unknown_error',
        feature_name: req.params.feature,
        attempted_state: req.body.enabled,
        failure_context: 'feature_toggle_failed',
      });
    }

    res.status(500).json({ message: 'Failed to toggle organization feature' });
  }
});

// Track subscription changes with comprehensive audit
router.put('/organizations/:id/subscription', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'update_organization_subscription', resource_type: 'organization_subscription' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = parseInt(req.params.id);
    const subscriptionUpdates = req.body;

    // Verify super admin access for subscription changes
    if (req.user?.admin_scope !== 'site') {
      if (req.user?.id && req.user?.organization_id) {
        await logActivity(req as any, 'subscription_update_denied', 'organization_subscription', organizationId, {
          denial_reason: 'insufficient_permissions_site_admin_required',
          admin_scope: req.user.admin_scope,
          attempted_changes: subscriptionUpdates,
        });
      }
      return res.status(403).json({ message: 'Site admin access required for subscription changes' });
    }

    // Get current subscription data for audit trail
    const currentOrg = await storage.getOrganizationById(organizationId);
    const currentSubscription = {
      plan: currentOrg?.subscription_plan,
      user_limit: currentOrg?.user_limit,
      billing_email: currentOrg?.billing_email,
      billing_status: currentOrg?.billing_status,
    };

    // Validate subscription changes
    if (subscriptionUpdates.user_limit && subscriptionUpdates.user_limit < 0) {
      return res.status(400).json({ message: 'User limit cannot be negative' });
    }

    // Update subscription
    const updatedOrg = await storage.updateOrganizationSubscription(organizationId, subscriptionUpdates);

    // Create comprehensive audit log for subscription change
    await auditLogger(
      req.user?.id,
      organizationId,
      'SUBSCRIPTION_UPDATE',
      'organization_subscription',
      organizationId,
      currentSubscription,
      {
        plan: updatedOrg.subscription_plan,
        user_limit: updatedOrg.user_limit,
        billing_email: updatedOrg.billing_email,
        billing_status: updatedOrg.billing_status,
      },
      req
    );

    // Log detailed subscription change activity
    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req, 'update_organization_subscription', 'organization_subscription', organizationId, {
      organization_name: currentOrg?.name,
      subscription_changes: subscriptionUpdates,
      previous_subscription: currentSubscription,
      new_subscription: {
        plan: updatedOrg.subscription_plan,
        user_limit: updatedOrg.user_limit,
        billing_status: updatedOrg.billing_status,
      },
      financial_impact: {
        plan_change: currentSubscription.plan !== updatedOrg.subscription_plan,
        user_limit_change: currentSubscription.user_limit !== updatedOrg.user_limit,
        billing_change: currentSubscription.billing_email !== updatedOrg.billing_email,
      },
      updated_by_admin: req.user.id,
      compliance_required: true,
      });
    }

    res.json({
      organization: updatedOrg,
      changes_applied: subscriptionUpdates,
      previous_subscription: currentSubscription,
      audit_trail: {
        action: 'subscription_update',
        updated_by: req.user?.id,
        updated_at: new Date().toISOString(),
        compliance_logged: true,
      }
    });

  } catch (error: any) {
    logger.error('Subscription update failed:', { 
      error, 
      organizationId: req.params.id,
      adminId: req.user?.id,
    });

    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req, 'subscription_update_error', 'organization_subscription', parseInt(req.params.id), {
        error_type: error?.message || 'unknown_error',
        attempted_changes: req.body,
        failure_context: 'subscription_update_failed',
      });
    }

    res.status(500).json({ message: 'Failed to update organization subscription' });
  }
});

// Enterprise compliance report generation
router.get('/compliance/report', 
  verifyToken, 
  verifyAdmin,
  activityLogger({ action_type: 'generate_compliance_report', resource_type: 'compliance_report' }),
  async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      organization_id,
      start_date, 
      end_date, 
      report_type = 'full',
      include_audit_trail = true 
    } = req.query;

    // Verify admin access for compliance reporting
    if (req.user?.admin_scope !== 'site' && organization_id && req.user?.organization_id !== parseInt(organization_id as string)) {
      if (req.user?.id && req.user?.organization_id) {
        await logActivity(req as any, 'compliance_report_denied', 'compliance_report', undefined, {
          denial_reason: 'insufficient_permissions',
          requested_org: organization_id,
          admin_scope: req.user.admin_scope,
        });
      }
      return res.status(403).json({ message: 'Access denied to compliance reporting' });
    }

    // Generate comprehensive compliance report
    const complianceReport = await storage.generateComplianceReport({
      organizationId: organization_id ? parseInt(organization_id as string) : undefined,
      startDate: start_date as string,
      endDate: end_date as string,
      reportType: report_type as string,
      includeAuditTrail: include_audit_trail === 'true',
    });

    // Log compliance report generation
    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req as any, 'generate_compliance_report', 'compliance_report', undefined, {
        report_scope: { organization_id, start_date, end_date, report_type },
        report_size: complianceReport.activities?.length || 0,
        audit_trail_included: include_audit_trail === 'true',
        generated_by_admin: req.user.id,
        compliance_timestamp: new Date().toISOString(),
      });
    }

    res.json({
      compliance_report: complianceReport,
      generation_metadata: {
        generated_by: req.user?.id,
        generated_at: new Date().toISOString(),
        report_type: report_type,
        scope: { organization_id, start_date, end_date },
      },
      audit_trail: {
        action: 'compliance_report_generated',
        for_compliance: true,
      }
    });

  } catch (error: any) {
    logger.error('Compliance report generation failed:', { 
      error, 
      adminId: req.user?.id,
      reportParams: req.query,
    });

    if (req.user?.id && req.user?.organization_id) {
      await logActivity(req as any, 'compliance_report_error', 'compliance_report', undefined, {
        error_type: error?.message || 'unknown_error',
        report_parameters: req.query,
        failure_context: 'compliance_report_generation_failed',
      });
    }

    res.status(500).json({ message: 'Failed to generate compliance report' });
  }
});

export default router;