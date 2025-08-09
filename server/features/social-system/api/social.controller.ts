// Social System API Layer
// HTTP endpoints for social features following vertical slice architecture

import express, { Request, Response } from 'express';
import { verifyToken, AuthenticatedRequest } from '../../../middleware/auth';
import { upload } from '../../../file-upload';
import { SocialDomain, type CreatePostData, type CreateCommentData, type ReactionData, type PollVoteData, type PostFilters } from '../domain/social.domain';
import { SocialRepository } from '../infrastructure/social.repository';
import { logger } from '@platform/sdk';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

/**
 * Social Controller
 * Handles HTTP requests for social features and delegates to domain layer
 */
export class SocialController {
  private repository: SocialRepository;

  constructor() {
    this.repository = new SocialRepository();
  }

  /**
   * Create a new social post
   */
  createPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const {
        content,
        type = 'text',
        visibility = 'public',
        tags,
        pollOptions,
        pollExpiresAt,
        recognitionData,
      } = req.body;

      const organizationId = req.user.organization_id || 1;

      // Handle image upload
      let imageUrl: string | undefined;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      // Parse poll options if provided
      let parsedPollOptions: string[] | undefined;
      if (pollOptions) {
        try {
          parsedPollOptions = typeof pollOptions === 'string' 
            ? JSON.parse(pollOptions) 
            : pollOptions;
        } catch (error: any) {
          return res.status(400).json({ message: 'Invalid poll options format' });
        }
      }

      // Parse recognition data if provided
      let parsedRecognitionData;
      if (recognitionData) {
        try {
          parsedRecognitionData = typeof recognitionData === 'string'
            ? JSON.parse(recognitionData)
            : recognitionData;
        } catch (error: any) {
          return res.status(400).json({ message: 'Invalid recognition data format' });
        }
      }

      const postData: CreatePostData = {
        content,
        type: type as 'text' | 'image' | 'poll' | 'recognition' | 'announcement',
        visibility: visibility as 'public' | 'team' | 'department',
        imageUrl,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        pollOptions: parsedPollOptions,
        pollExpiresAt: pollExpiresAt ? new Date(pollExpiresAt) : undefined,
        recognitionData: parsedRecognitionData,
      };

      const post = await SocialDomain.createPost(
        postData,
        req.user.id,
        organizationId,
        this.repository
      );

      logger.info('✅ Post created via API', {
        postId: post._id?.toString(),
        authorId: req.user.id,
        type: post.type,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error in createPost controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create post',
      });
    }
  };

  /**
   * Add comment to a post
   */
  addComment = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;
      const { content, parentCommentId } = req.body;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment content is required' });
      }

      const organizationId = req.user.organization_id || 1;

      const commentData: CreateCommentData = {
        content: content.trim(),
        parentCommentId,
      };

      const comment = await SocialDomain.addComment(
        postId,
        commentData,
        req.user.id,
        organizationId,
        this.repository
      );

      logger.info('✅ Comment added via API', {
        commentId: comment._id?.toString(),
        postId,
        authorId: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment added successfully',
      });
    } catch (error: any) {
      logger.error('❌ Error in addComment controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to add comment',
      });
    }
  };

  /**
   * Add reaction to post
   */
  addPostReaction = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;
      const { type } = req.body;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const organizationId = req.user.organization_id || 1;

      const reactionData: ReactionData = {
        type: type as 'like' | 'love' | 'celebrate' | 'support' | 'insightful',
      };

      const success = await SocialDomain.addPostReaction(
        postId,
        reactionData,
        req.user.id,
        organizationId,
        this.repository
      );

      if (success) {
        logger.info('✅ Reaction added via API', {
          postId,
          userId: req.user.id,
          type,
        });

        res.json({
          success: true,
          message: 'Reaction added successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to add reaction',
        });
      }
    } catch (error: any) {
      logger.error('❌ Error in addPostReaction controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to add reaction',
      });
    }
  };

  /**
   * Cast vote on a poll
   */
  castPollVote = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;
      const { option } = req.body;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const organizationId = req.user.organization_id || 1;

      const voteData: PollVoteData = {
        option,
      };

      const success = await SocialDomain.castPollVote(
        postId,
        voteData,
        req.user.id,
        organizationId,
        this.repository
      );

      if (success) {
        logger.info('✅ Poll vote cast via API', {
          postId,
          userId: req.user.id,
          option,
        });

        res.json({
          success: true,
          message: 'Vote cast successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to cast vote',
        });
      }
    } catch (error: any) {
      logger.error('❌ Error in castPollVote controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to cast vote',
      });
    }
  };

  /**
   * Delete a post
   */
  deletePost = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;
      const { reason } = req.body;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const organizationId = req.user.organization_id || 1;

      const success = await SocialDomain.deletePost(
        postId,
        req.user.id,
        organizationId,
        reason,
        this.repository
      );

      if (success) {
        logger.info('✅ Post deleted via API', {
          postId,
          deletedBy: req.user.id,
          reason,
        });

        res.json({
          success: true,
          message: 'Post deleted successfully',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete post',
        });
      }
    } catch (error: any) {
      logger.error('❌ Error in deletePost controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to delete post',
      });
    }
  };

  /**
   * Get posts with filtering (using existing MongoDB service for now)
   */
  getPosts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { limit = 20, skip = 0, authorId, type, search } = req.query;
      const organizationId = req.user.organization_id || 1;

      // Use the repository method for posts retrieval
      const posts = await this.repository.getPosts(
        organizationId,
        parseInt(limit as string),
        parseInt(skip as string),
        authorId ? parseInt(authorId as string) : undefined
      );

      res.json({
        success: true,
        data: posts,
      });
    } catch (error: any) {
      logger.error('❌ Error in getPosts controller', {
        error: error?.message || 'unknown_error',
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get posts',
      });
    }
  };

  /**
   * Get specific post by ID
   */
  getPost = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      const post = await this.repository.getPostById(postId);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found',
        });
      }

      // Increment view count
      await this.repository.incrementViewCount(postId);

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      logger.error('❌ Error in getPost controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get post',
      });
    }
  };

  /**
   * Get comments for a post
   */
  getPostComments = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { postId } = req.params;

      if (!ObjectId.isValid(postId)) {
        return res.status(400).json({ message: 'Invalid post ID' });
      }

      // Use the repository method for comments retrieval
      const comments = await this.repository.getCommentsByPost(postId);

      res.json({
        success: true,
        data: comments,
      });
    } catch (error: any) {
      logger.error('❌ Error in getPostComments controller', {
        error: error?.message || 'unknown_error',
        postId: req.params.postId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get comments',
      });
    }
  };
}