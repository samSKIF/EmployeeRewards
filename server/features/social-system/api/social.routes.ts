// Social System Routes
// Express router configuration for social features endpoints

import express from 'express';
import { verifyToken } from '../../../middleware/auth';
import { upload } from '../../../file-upload';
import { SocialController } from './social.controller';

const router = express.Router();
const socialController = new SocialController();

/**
 * Social Posts Routes
 */

// GET /api/social/posts - Get social feed posts
router.get('/posts', verifyToken, socialController.getPosts);

// POST /api/social/posts - Create a new post with optional image upload
router.post('/posts', verifyToken, upload.single('image'), socialController.createPost);

// GET /api/social/posts/:postId - Get specific post
router.get('/posts/:postId', verifyToken, socialController.getPost);

// DELETE /api/social/posts/:postId - Delete a post (soft delete)
router.delete('/posts/:postId', verifyToken, socialController.deletePost);

/**
 * Post Interactions Routes
 */

// POST /api/social/posts/:postId/reactions - Add reaction to post
router.post('/posts/:postId/reactions', verifyToken, socialController.addPostReaction);

// POST /api/social/posts/:postId/votes - Cast vote on poll
router.post('/posts/:postId/votes', verifyToken, socialController.castPollVote);

// GET /api/social/posts/:postId/comments - Get comments for a post
router.get('/posts/:postId/comments', verifyToken, socialController.getPostComments);

// POST /api/social/posts/:postId/comments - Add comment to post
router.post('/posts/:postId/comments', verifyToken, socialController.addComment);

/**
 * Health Check Route
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'social-system',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;