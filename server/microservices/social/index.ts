/**
 * Social Microservice
 * Handles all social-related operations including posts, comments, and reactions
 */
import { db, pool } from '../../db';
import express, { Request, Response } from 'express';
import { verifyToken, AuthenticatedRequest } from '../../middleware/auth';
import { upload } from '../../file-upload';

const router = express.Router();

/**
 * Create a new post with image upload support
 */
router.post('/posts', verifyToken, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  // Mark request as handled by microservice to prevent duplicate processing
  (req as any)._routeHandledByMicroservice = true;
  // Check if user exists
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  
  // Get fields from body (form data)
  const content = req.body.content;
  const type = req.body.type || 'standard';
  const tags = req.body.tags ? JSON.parse(req.body.tags) : undefined;
  
  // Get the image URL if an image was uploaded
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/${req.file.filename}`;
  }
  
  const userId = req.user.id;

  try {
    console.log('Social microservice: Handling post creation');
    
    // Get the post data from the request
    if (!content && !imageUrl) {
      return res.status(400).json({ error: 'Post must have content or image' });
    }

    // Execute the query to create a post
    const query = `
      INSERT INTO posts (user_id, content, image_url, type, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, user_id AS "userId", content, image_url AS "imageUrl", 
        type, tags, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    
    const result = await pool.query(query, [
      userId, 
      content || "", 
      imageUrl, 
      type, 
      tags ? JSON.stringify(tags) : null
    ]);
    const newPost = result.rows[0];

    console.log('Social microservice: Post created successfully:', newPost.id);
    
    return res.status(201).json(newPost);
  } catch (error) {
    console.error('Social microservice: Error creating post:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * Get all posts
 */
router.get('/posts', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('Social microservice: Handling get posts request');
    
    // Get user's company ID for tenant isolation
    const userEmail = req.user?.email;
    let companyId = null;
    
    if (userEmail) {
      const domain = userEmail.split('@')[1];
      const companyQuery = `SELECT id FROM companies WHERE domain = $1`;
      const companyResult = await pool.query(companyQuery, [domain]);
      if (companyResult.rows.length > 0) {
        companyId = companyResult.rows[0].id;
      }
    }
    
    // Execute the query to get posts only from users in the same company
    const query = `
      SELECT 
        p.id, 
        p.user_id AS "userId", 
        p.content, 
        p.image_url AS "imageUrl",
        p.type,
        p.created_at AS "createdAt", 
        p.updated_at AS "updatedAt",
        u.name AS "userName",
        u.avatar_url AS "userProfileImage",
        u.avatar_url AS "avatarUrl",
        u.job_title AS "userJobTitle",
        u.hire_date AS "userHireDate",
        (
          SELECT COUNT(*) 
          FROM reactions 
          WHERE post_id = p.id
        ) AS "reactionCount",
        (
          SELECT COUNT(*) 
          FROM comments 
          WHERE post_id = p.id
        ) AS "commentCount"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE ($1::integer IS NULL OR 
             u.organization_id = $1)
      ORDER BY p.created_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [companyId]);
    
    console.log(`Social microservice: Filtering posts for company ${companyId} (${userEmail})`);
    
    console.log('Social microservice: Retrieved', result.rows.length, 'posts');
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Social microservice: Error getting posts:', error);
    return res.status(500).json({ error: 'Failed to get posts' });
  }
});

/**
 * Get detailed reactions for a post with user information
 */
router.get('/posts/:postId/reactions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { type } = req.query;
    
    let query = `
      SELECT 
        r.id,
        r.type,
        r.created_at AS "createdAt",
        u.id AS "user.id",
        u.name AS "user.name",
        u.avatar_url AS "user.avatarUrl",
        u.job_title AS "user.jobTitle"
      FROM reactions r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = $1
    `;
    
    const params = [postId];
    
    if (type) {
      query += ` AND r.type = $2`;
      params.push(type as string);
    }
    
    query += ` ORDER BY r.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Transform the flat result to nested structure
    const reactions = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      user: {
        id: row['user.id'],
        name: row['user.name'],
        avatarUrl: row['user.avatarUrl'],
        jobTitle: row['user.jobTitle']
      },
      createdAt: row.createdAt
    }));
    
    return res.status(200).json(reactions);
  } catch (error) {
    console.error('Social microservice: Error getting post reactions:', error);
    return res.status(500).json({ error: 'Failed to get post reactions' });
  }
});

/**
 * Add reaction to comment
 */
router.post('/comment-reactions', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { commentId, type = 'like' } = req.body;
    const userId = req.user.id;
    
    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }
    
    // Check if user already reacted to this comment
    const existingQuery = `
      SELECT id FROM comment_reactions 
      WHERE comment_id = $1 AND user_id = $2
    `;
    const existingResult = await pool.query(existingQuery, [commentId, userId]);
    
    if (existingResult.rows.length > 0) {
      // Update existing reaction
      const updateQuery = `
        UPDATE comment_reactions 
        SET type = $1, created_at = NOW()
        WHERE comment_id = $2 AND user_id = $3
        RETURNING *
      `;
      const result = await pool.query(updateQuery, [type, commentId, userId]);
      return res.status(200).json(result.rows[0]);
    } else {
      // Create new reaction
      const insertQuery = `
        INSERT INTO comment_reactions (comment_id, user_id, type, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      const result = await pool.query(insertQuery, [commentId, userId, type]);
      return res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Social microservice: Error adding comment reaction:', error);
    return res.status(500).json({ error: 'Failed to add comment reaction' });
  }
});

/**
 * Remove reaction from comment
 */
router.delete('/comment-reactions/:commentId', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { commentId } = req.params;
    const userId = req.user.id;
    
    const deleteQuery = `
      DELETE FROM comment_reactions 
      WHERE comment_id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [commentId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    
    return res.status(200).json({ message: 'Reaction removed successfully' });
  } catch (error) {
    console.error('Social microservice: Error removing comment reaction:', error);
    return res.status(500).json({ error: 'Failed to remove comment reaction' });
  }
});

/**
 * Get comments for a post with reaction information
 */
router.get('/posts/:postId/comments', verifyToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { postId } = req.params;
    const userId = req.user.id;
    
    console.log('Social microservice: Fetching comments for post', postId);
    
    const query = `
      SELECT 
        c.id,
        c.content,
        c.created_at AS "createdAt",
        c.user_id AS "userId",
        u.name AS "user.name",
        u.avatar_url AS "user.avatarUrl",
        u.job_title AS "user.jobTitle",
        (
          SELECT COUNT(*) 
          FROM comment_reactions cr 
          WHERE cr.comment_id = c.id
        ) AS "reactionCount",
        (
          SELECT cr.type 
          FROM comment_reactions cr 
          WHERE cr.comment_id = c.id AND cr.user_id = $2
          LIMIT 1
        ) AS "userReaction"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `;
    
    const result = await pool.query(query, [postId, userId]);
    
    // Transform the flat result to nested structure
    const comments = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      userId: row.userId,
      user: {
        id: row.userId,
        name: row['user.name'],
        avatarUrl: row['user.avatarUrl'],
        jobTitle: row['user.jobTitle']
      },
      reactionCount: parseInt(row.reactionCount) || 0,
      userReaction: row.userReaction || null
    }));
    
    console.log('Social microservice: Retrieved', comments.length, 'comments for post', postId);
    
    return res.status(200).json(comments);
  } catch (error) {
    console.error('Social microservice: Error getting comments:', error);
    return res.status(500).json({ error: 'Failed to get comments' });
  }
});

export default router;