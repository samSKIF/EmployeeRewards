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
             u.email LIKE '%' || (SELECT domain FROM companies WHERE id = $1) OR
             EXISTS (SELECT 1 FROM employees e WHERE e.company_id = $1 AND e.email = u.email))
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

export default router;