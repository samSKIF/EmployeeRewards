import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { SocialService } from './socialService';
import { verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { upload } from '../file-upload';

const router = express.Router();
const socialService = new SocialService();

// Get social feed posts
router.get('/posts', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit = 20, skip = 0, authorId } = req.query;
    const organizationId = req.user.organizationId || 1;

    const posts = await socialService.getPosts(
      organizationId,
      parseInt(limit as string),
      parseInt(skip as string),
      authorId ? parseInt(authorId as string) : undefined
    );

    res.json(posts);
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/posts', verifyToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { content, type = 'text', visibility = 'public', tags, pollOptions } = req.body;
    const organizationId = req.user.organizationId || 1;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const postData = {
      authorId: req.user.id,
      authorName: req.user.name,
      organizationId,
      content: content.trim(),
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      type: type as 'text' | 'image' | 'poll' | 'recognition' | 'announcement',
      visibility: visibility as 'public' | 'team' | 'department',
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
      pollOptions: type === 'poll' && pollOptions ? JSON.parse(pollOptions) : undefined
    };

    const post = await socialService.createPost(postData);
    res.status(201).json(post);
  } catch (error: any) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: error.message || 'Failed to create post' });
  }
});

// Get a specific post
router.get('/posts/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await socialService.getPostById(id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error: any) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch post' });
  }
});

// Delete a post
router.delete('/posts/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await socialService.getPostById(id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user owns the post or is admin
    if (post.authorId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    const success = await socialService.deletePost(id, req.user.id);
    
    if (success) {
      res.json({ message: 'Post deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete post' });
    }
  } catch (error: any) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: error.message || 'Failed to delete post' });
  }
});

// Add reaction to post
router.post('/posts/:id/reactions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { type } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    if (!type || !['like', 'love', 'celebrate', 'support', 'insightful'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    const success = await socialService.addReactionToPost(id, req.user.id, req.user.name, type);
    
    if (success) {
      res.json({ message: 'Reaction added successfully' });
    } else {
      res.status(500).json({ message: 'Failed to add reaction' });
    }
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ message: error.message || 'Failed to add reaction' });
  }
});

// Remove reaction from post
router.delete('/posts/:id/reactions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const success = await socialService.removeReactionFromPost(id, req.user.id);
    
    if (success) {
      res.json({ message: 'Reaction removed successfully' });
    } else {
      res.status(500).json({ message: 'Failed to remove reaction' });
    }
  } catch (error: any) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ message: error.message || 'Failed to remove reaction' });
  }
});

// Get comments for a post
router.get('/posts/:id/comments', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const comments = await socialService.getCommentsByPost(id);
    res.json(comments);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch comments' });
  }
});

// Create a comment
router.post('/posts/:id/comments', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { content } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const organizationId = req.user.organizationId || 1;

    const commentData = {
      postId: new ObjectId(id),
      authorId: req.user.id,
      authorName: req.user.name,
      organizationId,
      content: content.trim()
    };

    const comment = await socialService.createComment(commentData);
    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Error creating comment:', error);
    res.status(500).json({ message: error.message || 'Failed to create comment' });
  }
});

// Delete a comment
router.delete('/comments/:id', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const success = await socialService.deleteComment(id, req.user.id);
    
    if (success) {
      res.json({ message: 'Comment deleted successfully' });
    } else {
      res.status(500).json({ message: 'Failed to delete comment' });
    }
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: error.message || 'Failed to delete comment' });
  }
});

// Get user notifications
router.get('/notifications', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { limit = 20, skip = 0 } = req.query;

    const notifications = await socialService.getUserNotifications(
      req.user.id,
      parseInt(limit as string),
      parseInt(skip as string)
    );

    res.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    const success = await socialService.markNotificationAsRead(id);
    
    if (success) {
      res.json({ message: 'Notification marked as read' });
    } else {
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message || 'Failed to mark notification as read' });
  }
});

// Get social stats
router.get('/stats', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const organizationId = req.user.organizationId || 1;
    const stats = await socialService.getUserSocialStats(req.user.id, organizationId);

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching social stats:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch social stats' });
  }
});

// Search posts
router.get('/search', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { q, limit = 20 } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const organizationId = req.user.organizationId || 1;
    const posts = await socialService.searchPosts(organizationId, q.trim(), parseInt(limit as string));

    res.json(posts);
  } catch (error: any) {
    console.error('Error searching posts:', error);
    res.status(500).json({ message: error.message || 'Failed to search posts' });
  }
});

export default router;