// Interest Channels API Controller
// Handles HTTP requests and responses for interest channels management operations

import { Request, Response } from 'express';
import { InterestChannelsDomain } from '../domain/interest-channels.domain';
import { InterestChannelsRepository } from '../infrastructure/interest-channels.repository';
import { AuthenticatedRequest } from '../../../middleware/auth';
import { logger } from '@shared/logger';
import type {
  CreateInterestChannelData,
  UpdateInterestChannelData,
  CreateChannelPostData,
  UpdateChannelPostData,
  CreateJoinRequestData,
  InterestChannelFilters,
  ChannelPostFilters,
} from '../domain/interest-channels.domain';

// Initialize repository
const interestChannelsRepository = new InterestChannelsRepository();

/**
 * Interest Channels Controller
 */
export class InterestChannelsController {
  /**
   * Get all interest channels for organization
   */
  static async getInterestChannels(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const filters: InterestChannelFilters = {
        channelType: req.query.channelType as string,
        isPrivate: req.query.isPrivate === 'true' ? true : req.query.isPrivate === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        interestId: req.query.interestId ? parseInt(req.query.interestId as string) : undefined,
        createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
        search: req.query.search as string,
      };

      const channels = await interestChannelsRepository.getChannelsByOrganization(user.organization_id, filters);

      logger.info('✅ Interest channels retrieved', {
        organization_id: user.organization_id,
        count: channels.length,
        userId: user.id,
        filters,
      });

      res.json({
        success: true,
        data: channels,
        message: `Retrieved ${channels.length} interest channels`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving interest channels', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
        filters: req.query,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve interest channels',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Get interest channel by ID
   */
  static async getInterestChannelById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const channelId = parseInt(id);

      if (isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid channel ID',
          message: 'Channel ID must be a valid number',
        });
        return;
      }

      const channel = await interestChannelsRepository.getChannelById(channelId, user.organization_id);

      if (!channel) {
        res.status(404).json({
          success: false,
          error: 'Channel not found',
          message: 'Interest channel not found or not accessible in your organization',
        });
        return;
      }

      // Check if user has access (for private channels, must be a member)
      if (channel.isPrivate) {
        const membership = await interestChannelsRepository.getChannelMembership(channelId, user.id, user.organization_id);
        if (!membership) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'Must be a member to access this private channel',
          });
          return;
        }
      }

      logger.info('✅ Interest channel retrieved by ID', {
        channelId,
        name: channel.name,
        userId: user.id,
      });

      res.json({
        success: true,
        data: channel,
        message: 'Interest channel retrieved successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving interest channel by ID', {
        error: error?.message || 'unknown_error',
        channelId: req.params.id,
        userId: req.user!.id,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve interest channel',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Create a new interest channel
   */
  static async createInterestChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const data: CreateInterestChannelData = req.body;

      const channel = await InterestChannelsDomain.createInterestChannel(
        data,
        user.organization_id,
        user.id,
        interestChannelsRepository
      );

      logger.info('✅ Interest channel created via controller', {
        channelId: channel.id,
        name: channel.name,
        interestId: channel.interestId,
        organization_id: user.organization_id,
        createdBy: user.id,
      });

      res.status(201).json({
        success: true,
        data: channel,
        message: 'Interest channel created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error creating interest channel via controller', {
        error: error?.message || 'unknown_error',
        organization_id: req.user!.organization_id,
        createdBy: req.user!.id,
        data: req.body,
      });

      res.status(400).json({
        success: false,
        error: 'Failed to create interest channel',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Update an interest channel
   */
  static async updateInterestChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      if (!user.organization_id) {
        res.status(400).json({
          success: false,
          error: 'Invalid organization',
          message: 'User must belong to an organization',
        });
        return;
      }

      const { id } = req.params;
      const channelId = parseInt(id);
      const updateData: UpdateInterestChannelData = req.body;

      if (isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid channel ID',
          message: 'Channel ID must be a valid number',
        });
        return;
      }

      const updatedChannel = await InterestChannelsDomain.updateInterestChannel(
        channelId,
        updateData,
        user.organization_id,
        user.id,
        interestChannelsRepository
      );

      logger.info('✅ Interest channel updated via controller', {
        channelId: updatedChannel.id,
        name: updatedChannel.name,
        organization_id: user.organization_id,
        userId: user.id,
      });

      res.json({
        success: true,
        data: updatedChannel,
        message: 'Interest channel updated successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error updating interest channel via controller', {
        error: error?.message || 'unknown_error',
        channelId: req.params.id,
        organization_id: req.user!.organization_id,
        userId: req.user!.id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('permission') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to update interest channel',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Get channel posts
   */
  static async getChannelPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const channelId = parseInt(id);

      if (isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid channel ID',
          message: 'Channel ID must be a valid number',
        });
        return;
      }

      // Verify channel access
      const channel = await interestChannelsRepository.getChannelById(channelId, user.organization_id);
      if (!channel) {
        res.status(404).json({
          success: false,
          error: 'Channel not found',
          message: 'Interest channel not found or not accessible in your organization',
        });
        return;
      }

      // Check membership for private channels
      if (channel.isPrivate) {
        const membership = await interestChannelsRepository.getChannelMembership(channelId, user.id, user.organization_id);
        if (!membership) {
          res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'Must be a member to view posts in this private channel',
          });
          return;
        }
      }

      const filters: ChannelPostFilters = {
        postType: req.query.postType as string,
        authorId: req.query.authorId ? parseInt(req.query.authorId as string) : undefined,
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };

      const posts = await interestChannelsRepository.getChannelPosts(channelId, filters, user.organization_id);

      logger.info('✅ Channel posts retrieved', {
        channelId,
        count: posts.length,
        userId: user.id,
        filters,
      });

      res.json({
        success: true,
        data: posts,
        message: `Retrieved ${posts.length} channel posts`,
      });
    } catch (error: any) {
      logger.error('❌ Error retrieving channel posts', {
        error: error?.message || 'unknown_error',
        channelId: req.params.id,
        userId: req.user!.id,
        filters: req.query,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve channel posts',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Create channel post
   */
  static async createChannelPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const data: CreateChannelPostData = req.body;

      const post = await InterestChannelsDomain.createChannelPost(
        data,
        user.id,
        user.organization_id,
        interestChannelsRepository
      );

      logger.info('✅ Channel post created via controller', {
        postId: post.id,
        channelId: data.channelId,
        postType: post.postType,
        userId: user.id,
        organization_id: user.organization_id,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Channel post created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error creating channel post via controller', {
        error: error?.message || 'unknown_error',
        channelId: req.body?.channelId,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('member') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to create channel post',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Request to join channel
   */
  static async requestToJoinChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const data: CreateJoinRequestData = req.body;

      const result = await InterestChannelsDomain.requestToJoinChannel(
        data,
        user.id,
        user.organization_id,
        interestChannelsRepository
      );

      // Determine if it was auto-join or request created
      const isAutoJoin = 'role' in result;
      const message = isAutoJoin ? 'Joined channel successfully' : 'Join request submitted successfully';

      logger.info('✅ Channel join request processed via controller', {
        channelId: data.channelId,
        userId: user.id,
        organization_id: user.organization_id,
        isAutoJoin,
      });

      res.status(201).json({
        success: true,
        data: result,
        message,
      });
    } catch (error: any) {
      logger.error('❌ Error processing channel join request via controller', {
        error: error?.message || 'unknown_error',
        channelId: req.body?.channelId,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
        data: req.body,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('already') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to process join request',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Process join request (approve/reject)
   */
  static async processJoinRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { requestId } = req.params;
      const { action } = req.body;

      const requestIdNum = parseInt(requestId);
      if (isNaN(requestIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid request ID',
          message: 'Request ID must be a valid number',
        });
        return;
      }

      if (!['approve', 'reject'].includes(action)) {
        res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Action must be either "approve" or "reject"',
        });
        return;
      }

      const result = await InterestChannelsDomain.processJoinRequest(
        requestIdNum,
        action,
        user.id,
        user.organization_id,
        interestChannelsRepository
      );

      logger.info('✅ Join request processed via controller', {
        requestId: requestIdNum,
        action,
        reviewedBy: user.id,
        organization_id: user.organization_id,
      });

      res.json({
        success: true,
        data: result,
        message: `Join request ${action}d successfully`,
      });
    } catch (error: any) {
      logger.error('❌ Error processing join request via controller', {
        error: error?.message || 'unknown_error',
        requestId: req.params.requestId,
        action: req.body?.action,
        reviewedBy: req.user!.id,
        organization_id: req.user!.organization_id,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('permission') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to process join request',
        message: error?.message || 'Validation failed',
      });
    }
  }

  /**
   * Leave channel
   */
  static async leaveChannel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { id } = req.params;
      const channelId = parseInt(id);

      if (isNaN(channelId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid channel ID',
          message: 'Channel ID must be a valid number',
        });
        return;
      }

      const success = await InterestChannelsDomain.leaveChannel(
        channelId,
        user.id,
        user.organization_id,
        interestChannelsRepository
      );

      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Failed to leave channel',
          message: 'Unable to leave channel',
        });
        return;
      }

      logger.info('✅ User left channel via controller', {
        channelId,
        userId: user.id,
        organization_id: user.organization_id,
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('❌ Error leaving channel via controller', {
        error: error?.message || 'unknown_error',
        channelId: req.params.id,
        userId: req.user!.id,
        organization_id: req.user!.organization_id,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('not a member') ? 400 :
                        error?.message?.includes('last admin') ? 409 : 500;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to leave channel',
        message: error?.message || 'Internal server error',
      });
    }
  }

  /**
   * Toggle post pin status
   */
  static async togglePostPin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { channelId, postId } = req.params;
      
      const channelIdNum = parseInt(channelId);
      const postIdNum = parseInt(postId);

      if (isNaN(channelIdNum) || isNaN(postIdNum)) {
        res.status(400).json({
          success: false,
          error: 'Invalid IDs',
          message: 'Channel ID and Post ID must be valid numbers',
        });
        return;
      }

      const result = await InterestChannelsDomain.togglePostPin(
        postIdNum,
        channelIdNum,
        user.id,
        user.organization_id,
        interestChannelsRepository
      );

      logger.info('✅ Post pin status toggled via controller', {
        postId: postIdNum,
        channelId: channelIdNum,
        pinned: result.pinned,
        pinnedBy: user.id,
        organization_id: user.organization_id,
      });

      res.json({
        success: true,
        data: {
          post: result.post,
          pinned: result.pinned,
        },
        message: `Post ${result.pinned ? 'pinned' : 'unpinned'} successfully`,
      });
    } catch (error: any) {
      logger.error('❌ Error toggling post pin via controller', {
        error: error?.message || 'unknown_error',
        channelId: req.params.channelId,
        postId: req.params.postId,
        pinnedBy: req.user!.id,
        organization_id: req.user!.organization_id,
      });

      const statusCode = error?.message?.includes('not found') ? 404 :
                        error?.message?.includes('permission') ? 403 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Failed to toggle post pin',
        message: error?.message || 'Validation failed',
      });
    }
  }
}