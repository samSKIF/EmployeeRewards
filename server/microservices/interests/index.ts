import { Router } from "express";
import { db, pool } from "../../db";
import { interests, employeeInterests, users, visibilityEnum } from "@shared/schema";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { AuthenticatedRequest, verifyToken } from "../../middleware/auth";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const router = Router();

// Apply authentication to all routes in this router
router.use(verifyToken);

// Custom middleware to validate request body against a Zod schema
const validateRequestBody = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      return res.status(400).json({ message: "Invalid request data" });
    }
  };
};

// Autocomplete lookup for interests
// GET /api/interests?query=... or GET /api/interests?popular=true
router.get("/interests", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling interests lookup");
    const { query, popular } = req.query;
    
    let allInterests;
    if (query && typeof query === "string") {
      // Search for interests that match the query
      allInterests = await db
        .select()
        .from(interests)
        .where(ilike(interests.label, `%${query}%`))
        .limit(20);
    } else if (popular === 'true') {
      // Return popular interests for suggestions
      console.log("Interests microservice: Fetching popular interests");
      
      try {
        // Just get a sample of interests for now
        const result = await db
          .select()
          .from(interests)
          .limit(10);
          
        allInterests = result;
        
        // If no interests exist in the database, use default set
        if (result.length === 0) {
          throw new Error("No interests found in database");
        }
      } catch (error) {
        console.log("Error fetching popular interests:", error);
        
        // Default interests to show if database is empty
        allInterests = [
          { id: 1, label: "Reading", category: "Lifestyle & Wellness", icon: "📚" },
          { id: 2, label: "Travel", category: "Lifestyle & Wellness", icon: "✈️" },
          { id: 3, label: "Photography", category: "Arts & Creativity", icon: "📷" },
          { id: 4, label: "Cooking", category: "Food & Drink", icon: "🍳" },
          { id: 5, label: "Fitness", category: "Sports & Fitness", icon: "🏋️" },
          { id: 6, label: "Music", category: "Arts & Creativity", icon: "🎵" },
          { id: 7, label: "Gaming", category: "Technology & Gaming", icon: "🎮" },
          { id: 8, label: "Hiking", category: "Sports & Fitness", icon: "🥾" },
          { id: 9, label: "Gardening", category: "Lifestyle & Wellness", icon: "🌱" },
          { id: 10, label: "Coding", category: "Technology & Gaming", icon: "💻" }
        ];
      }
    } else {
      // Return top 20 interests if no query provided
      allInterests = await db
        .select()
        .from(interests)
        .limit(20);
    }
    
    res.status(200).json(allInterests);
  } catch (error: any) {
    console.error("Error fetching interests:", error);
    res.status(500).json({ message: error.message || "Failed to fetch interests" });
  }
});

// Get employee interests
// GET /api/employees/:id/interests
router.get("/employees/:id/interests", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling get employee interests");
    const employeeId = parseInt(req.params.id);
    
    // Check if the employee exists
    const [employee] = await db
      .select()
      .from(users)
      .where(eq(users.id, employeeId));
      
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Get the current user's ID from the request
    const currentUserId = req.user?.id;
    const isCurrentUser = currentUserId === employeeId;
    const isManager = false; // TODO: Implement manager check
    
    // Fetch the employee's interests based on visibility
    const employeeInterestsData = await db
      .select({
        interest: interests,
        customLabel: employeeInterests.customLabel,
        isPrimary: employeeInterests.isPrimary,
        visibility: employeeInterests.visibility
      })
      .from(employeeInterests)
      .innerJoin(interests, eq(employeeInterests.interestId, interests.id))
      .where(
        and(
          eq(employeeInterests.employeeId, employeeId),
          or(
            eq(employeeInterests.visibility, "EVERYONE"),
            isCurrentUser ? eq(employeeInterests.visibility, employeeInterests.visibility) : undefined,
            isManager ? eq(employeeInterests.visibility, "TEAM") : undefined
          )
        )
      );
    
    // Format the response
    const formattedInterests = employeeInterestsData.map(item => ({
      id: item.interest.id,
      label: item.customLabel || item.interest.label,
      category: item.interest.category,
      icon: item.interest.icon,
      isPrimary: item.isPrimary,
      visibility: item.visibility
    }));
    
    res.status(200).json(formattedInterests);
  } catch (error: any) {
    console.error("Error fetching employee interests:", error);
    res.status(500).json({ message: error.message || "Failed to fetch employee interests" });
  }
});

// Update employee interests
// POST /api/employees/:id/interests
const updateInterestsSchema = z.array(z.object({
  interestId: z.number().optional(),
  customLabel: z.string().optional(),
  isPrimary: z.boolean().default(false),
  visibility: z.enum(["EVERYONE", "TEAM", "PRIVATE"]).default("EVERYONE")
}));

router.post("/employees/:id/interests", validateRequestBody(updateInterestsSchema), async (req: AuthenticatedRequest, res) => {
  try {
    console.log("=== INTERESTS MICROSERVICE: POST REQUEST RECEIVED ===");
    console.log("URL:", req.url);
    console.log("Method:", req.method);
    console.log("Body:", req.body);
    console.log("Params:", req.params);
    
    const employeeId = parseInt(req.params.id);
    const currentUserId = req.user?.id;
    console.log("Employee ID:", employeeId, "Current User ID:", currentUserId);
    
    // Check if the employee exists
    const [employee] = await db
      .select()
      .from(users)
      .where(eq(users.id, employeeId));
      
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Check if the current user is authorized to update this employee's interests
    if (currentUserId !== employeeId) {
      return res.status(403).json({ message: "Not authorized to update this employee's interests" });
    }
    
    // Start a transaction to delete old interests and insert new ones
    const interestsData = req.body;
    console.log('Received interests data:', JSON.stringify(interestsData, null, 2));
    
    // Transaction to update interests
    await db.transaction(async (tx) => {
      // Delete all existing interests for this employee
      console.log('Deleting existing interests for employee:', employeeId);
      await tx
        .delete(employeeInterests)
        .where(eq(employeeInterests.employeeId, employeeId));
      
      // Insert new interests
      console.log('Processing', interestsData.length, 'interests');
      for (const interest of interestsData) {
        console.log('Processing interest:', interest);
        let interestId = interest.interestId;
        
        // If no interestId is provided but customLabel is, create a new interest
        if (!interestId && interest.customLabel) {
          console.log('Creating custom interest:', interest.customLabel);
          const [newInterest] = await tx
            .insert(interests)
            .values({
              label: interest.customLabel,
              category: "Custom", // Default category for custom interests
              icon: "✨" // Default icon for custom interests
            })
            .returning();
          
          interestId = newInterest.id;
          console.log('Created custom interest with ID:', interestId);
        }
        
        // Skip if no valid interestId
        if (!interestId) {
          console.log('Skipping interest - no valid interestId:', interest);
          continue;
        }
        
        // Insert the employee interest relation
        const insertData = {
          employeeId,
          interestId,
          customLabel: interest.customLabel,
          isPrimary: interest.isPrimary,
          visibility: interest.visibility
        };
        console.log('Inserting employee interest:', insertData);
        
        await tx
          .insert(employeeInterests)
          .values(insertData);
        
        console.log('Successfully inserted employee interest');
      }
    });
    
    // Fetch the updated interests
    const updatedInterests = await db
      .select({
        interest: interests,
        customLabel: employeeInterests.customLabel,
        isPrimary: employeeInterests.isPrimary,
        visibility: employeeInterests.visibility
      })
      .from(employeeInterests)
      .innerJoin(interests, eq(employeeInterests.interestId, interests.id))
      .where(eq(employeeInterests.employeeId, employeeId));
    
    // Format the response
    const formattedInterests = updatedInterests.map(item => ({
      id: item.interest.id,
      label: item.customLabel || item.interest.label,
      category: item.interest.category,
      icon: item.interest.icon,
      isPrimary: item.isPrimary,
      visibility: item.visibility
    }));
    
    res.status(200).json(formattedInterests);
  } catch (error: any) {
    console.error("Error updating employee interests:", error);
    res.status(500).json({ message: error.message || "Failed to update employee interests" });
  }
});

// Admin routes
// GET /api/admin/interests - Paginated list
router.get("/admin/interests", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling admin interests lookup");
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized to access admin resources" });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: db.fn.count(interests.id) })
      .from(interests);
    
    // Get interests with pagination
    const allInterests = await db
      .select()
      .from(interests)
      .limit(limit)
      .offset(offset)
      .orderBy(interests.category, interests.label);
    
    res.status(200).json({
      interests: allInterests,
      pagination: {
        total: Number(count),
        page,
        limit,
        totalPages: Math.ceil(Number(count) / limit)
      }
    });
  } catch (error: any) {
    console.error("Error fetching admin interests:", error);
    res.status(500).json({ message: error.message || "Failed to fetch interests" });
  }
});

// Create interest
// POST /api/admin/interests
const createInterestSchema = z.object({
  label: z.string().min(1, "Label is required"),
  category: z.string().min(1, "Category is required"),
  icon: z.string().optional()
});

router.post("/admin/interests", validateRequestBody(createInterestSchema), async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling create interest");
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized to create interests" });
    }
    
    const { label, category, icon } = req.body;
    
    // Check if interest with same label already exists
    const [existingInterest] = await db
      .select()
      .from(interests)
      .where(eq(interests.label, label));
      
    if (existingInterest) {
      return res.status(400).json({ message: "An interest with this label already exists" });
    }
    
    // Create new interest
    const [newInterest] = await db
      .insert(interests)
      .values({
        label,
        category,
        icon
      })
      .returning();
    
    res.status(201).json(newInterest);
  } catch (error: any) {
    console.error("Error creating interest:", error);
    res.status(500).json({ message: error.message || "Failed to create interest" });
  }
});

// Update interest
// PATCH /api/admin/interests/:id
router.patch("/admin/interests/:id", validateRequestBody(createInterestSchema), async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling update interest");
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized to update interests" });
    }
    
    const interestId = parseInt(req.params.id);
    const { label, category, icon } = req.body;
    
    // Check if interest exists
    const [existingInterest] = await db
      .select()
      .from(interests)
      .where(eq(interests.id, interestId));
      
    if (!existingInterest) {
      return res.status(404).json({ message: "Interest not found" });
    }
    
    // Update interest
    const [updatedInterest] = await db
      .update(interests)
      .set({
        label,
        category,
        icon
      })
      .where(eq(interests.id, interestId))
      .returning();
    
    res.status(200).json(updatedInterest);
  } catch (error: any) {
    console.error("Error updating interest:", error);
    res.status(500).json({ message: error.message || "Failed to update interest" });
  }
});

// Delete interest
// DELETE /api/admin/interests/:id
router.delete("/admin/interests/:id", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling delete interest");
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete interests" });
    }
    
    const interestId = parseInt(req.params.id);
    
    // Check if interest exists
    const [existingInterest] = await db
      .select()
      .from(interests)
      .where(eq(interests.id, interestId));
      
    if (!existingInterest) {
      return res.status(404).json({ message: "Interest not found" });
    }
    
    // Delete interest
    await db
      .delete(interests)
      .where(eq(interests.id, interestId));
    
    res.status(200).json({ message: "Interest deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting interest:", error);
    res.status(500).json({ message: error.message || "Failed to delete interest" });
  }
});

// Merge interests
// POST /api/admin/interests/merge
const mergeInterestsSchema = z.object({
  keepId: z.number(),
  mergeIds: z.array(z.number())
});

router.post("/admin/interests/merge", validateRequestBody(mergeInterestsSchema), async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling merge interests");
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Not authorized to merge interests" });
    }
    
    const { keepId, mergeIds } = req.body;
    
    // Check if keepId is valid
    const [keepInterest] = await db
      .select()
      .from(interests)
      .where(eq(interests.id, keepId));
      
    if (!keepInterest) {
      return res.status(404).json({ message: "Interest to keep not found" });
    }
    
    // Start a transaction for merging
    await db.transaction(async (tx) => {
      // Update all employee interests to point to the kept interest
      await tx
        .update(employeeInterests)
        .set({ interestId: keepId })
        .where(inArray(employeeInterests.interestId, mergeIds));
      
      // Delete the merged interests
      await tx
        .delete(interests)
        .where(inArray(interests.id, mergeIds));
    });
    
    res.status(200).json({ message: "Interests merged successfully" });
  } catch (error: any) {
    console.error("Error merging interests:", error);
    res.status(500).json({ message: error.message || "Failed to merge interests" });
  }
});

// === INTEREST GROUPS API ROUTES ===

// Get interests with member counts for the current user's organization
router.get('/with-counts', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's organization
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const organizationId = user[0].organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }
    
    // Get all interests with member counts for this organization
    const interestsWithCounts = await pool.query(`
      SELECT 
        i.*,
        COALESCE(member_counts.count, 0)::int as "memberCount",
        CASE WHEN ig.id IS NOT NULL THEN true ELSE false END as "hasGroup",
        ig.id as "groupId",
        CASE WHEN ui.employee_id IS NOT NULL THEN true ELSE false END as "userIsMember"
      FROM interests i
      LEFT JOIN (
        SELECT 
          ei.interest_id, 
          COUNT(DISTINCT ei.employee_id) as count
        FROM employee_interests ei 
        JOIN users u ON u.id = ei.employee_id 
        WHERE u.organization_id = $1
        GROUP BY ei.interest_id
      ) member_counts ON member_counts.interest_id = i.id
      LEFT JOIN interest_groups ig ON ig.interest_id = i.id AND ig.organization_id = $1
      LEFT JOIN employee_interests ui ON ui.interest_id = i.id AND ui.employee_id = $2
      ORDER BY i.category, i.label
    `, [organizationId, userId]);
    
    res.json(interestsWithCounts.rows);
  } catch (error) {
    console.error('Error fetching interests with counts:', error);
    res.status(500).json({ message: 'Failed to fetch interests with counts' });
  }
});

// Get or create interest group for a specific interest
router.post('/groups/:interestId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const interestId = parseInt(req.params.interestId);
    
    // Get user's organization
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const organizationId = user[0].organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }
    
    // Get interest details
    const interest = await db.select().from(interests).where(eq(interests.id, interestId)).limit(1);
    if (!interest[0]) {
      return res.status(404).json({ message: 'Interest not found' });
    }
    
    // Check if group already exists
    const existingGroup = await pool.query(`
      SELECT * FROM interest_groups 
      WHERE interest_id = $1 AND organization_id = $2
    `, [interestId, organizationId]);
    
    let groupId;
    
    if (existingGroup.rows.length === 0) {
      // Create new group
      const newGroup = await pool.query(`
        INSERT INTO interest_groups (interest_id, organization_id, name, description, member_count)
        VALUES ($1, $2, $3, $4, 0)
        RETURNING id
      `, [
        interestId,
        organizationId,
        `${interest[0].label} Community`,
        `Connect with colleagues who share your interest in ${interest[0].label}`
      ]);
      
      groupId = newGroup.rows[0].id;
    } else {
      groupId = existingGroup.rows[0].id;
    }
    
    // Check if user is already a member
    const membership = await pool.query(`
      SELECT * FROM interest_group_members 
      WHERE group_id = $1 AND user_id = $2 AND is_active = true
    `, [groupId, userId]);
    
    if (membership.rows.length === 0) {
      // Add user to group
      await pool.query(`
        INSERT INTO interest_group_members (group_id, user_id, is_active)
        VALUES ($1, $2, true)
      `, [groupId, userId]);
      
      // Update member count
      await pool.query(`
        UPDATE interest_groups 
        SET member_count = member_count + 1, updated_at = NOW()
        WHERE id = $1
      `, [groupId]);
    }
    
    // Get final group details
    const finalGroup = await pool.query(`
      SELECT * FROM interest_groups WHERE id = $1
    `, [groupId]);
    
    res.json({ 
      group: finalGroup.rows[0], 
      joined: membership.rows.length === 0,
      message: membership.rows.length === 0 ? 'Successfully joined group' : 'Already a member'
    });
  } catch (error) {
    console.error('Error creating/joining interest group:', error);
    res.status(500).json({ message: 'Failed to create or join interest group' });
  }
});

// Get interest group details with recent posts
router.get('/groups/:groupId/details', async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user!.id;
    
    // Check if user is a member
    const membership = await pool.query(`
      SELECT * FROM interest_group_members 
      WHERE group_id = $1 AND user_id = $2 AND is_active = true
    `, [groupId, userId]);
    
    if (membership.rows.length === 0) {
      return res.status(403).json({ message: 'You must be a member to view this group' });
    }
    
    // Get group details with interest info
    const groupDetails = await pool.query(`
      SELECT ig.*, i.label as interest_label, i.category as interest_category, i.icon as interest_icon
      FROM interest_groups ig
      JOIN interests i ON i.id = ig.interest_id
      WHERE ig.id = $1
    `, [groupId]);
    
    if (groupDetails.rows.length === 0) {
      return res.status(404).json({ message: 'Interest group not found' });
    }
    
    // Get recent posts with user info
    const posts = await pool.query(`
      SELECT 
        igp.*,
        u.name as user_name,
        u.avatar_url as user_avatar_url,
        u.job_title as user_job_title,
        u.department as user_department
      FROM interest_group_posts igp
      JOIN users u ON u.id = igp.user_id
      WHERE igp.group_id = $1
      ORDER BY igp.is_pinned DESC, igp.created_at DESC
      LIMIT 20
    `, [groupId]);
    
    res.json({
      group: {
        id: groupDetails.rows[0].id,
        name: groupDetails.rows[0].name,
        description: groupDetails.rows[0].description,
        memberCount: groupDetails.rows[0].member_count,
        createdAt: groupDetails.rows[0].created_at,
        interest: {
          id: groupDetails.rows[0].interest_id,
          label: groupDetails.rows[0].interest_label,
          category: groupDetails.rows[0].interest_category,
          icon: groupDetails.rows[0].interest_icon
        }
      },
      posts: posts.rows.map(post => ({
        id: post.id,
        content: post.content,
        imageUrl: post.image_url,
        type: post.type,
        tags: post.tags,
        isPinned: post.is_pinned,
        likeCount: post.like_count,
        commentCount: post.comment_count,
        createdAt: post.created_at,
        user: {
          id: post.user_id,
          name: post.user_name,
          avatarUrl: post.user_avatar_url,
          jobTitle: post.user_job_title,
          department: post.user_department
        }
      })),
      isMember: true
    });
  } catch (error) {
    console.error('Error fetching interest group details:', error);
    res.status(500).json({ message: 'Failed to fetch interest group details' });
  }
});

// Create a new post in an interest group
router.post('/groups/:groupId/posts', async (req: AuthenticatedRequest, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = req.user!.id;
    const { content, imageUrl, type = 'standard', tags = [] } = req.body;
    
    if (!content?.trim()) {
      return res.status(400).json({ message: 'Post content is required' });
    }
    
    // Verify user is a member of the group
    const membership = await pool.query(`
      SELECT * FROM interest_group_members 
      WHERE group_id = $1 AND user_id = $2 AND is_active = true
    `, [groupId, userId]);
    
    if (membership.rows.length === 0) {
      return res.status(403).json({ message: 'You must be a member to post in this group' });
    }
    
    // Create the post
    const newPost = await pool.query(`
      INSERT INTO interest_group_posts (group_id, user_id, content, image_url, type, tags)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [groupId, userId, content.trim(), imageUrl, type, tags]);
    
    // Get post with user details
    const postWithUser = await pool.query(`
      SELECT 
        igp.*,
        u.name as user_name,
        u.avatar_url as user_avatar_url,
        u.job_title as user_job_title,
        u.department as user_department
      FROM interest_group_posts igp
      JOIN users u ON u.id = igp.user_id
      WHERE igp.id = $1
    `, [newPost.rows[0].id]);
    
    const post = postWithUser.rows[0];
    res.status(201).json({
      id: post.id,
      content: post.content,
      imageUrl: post.image_url,
      type: post.type,
      tags: post.tags,
      isPinned: post.is_pinned,
      likeCount: post.like_count,
      commentCount: post.comment_count,
      createdAt: post.created_at,
      user: {
        id: post.user_id,
        name: post.user_name,
        avatarUrl: post.user_avatar_url,
        jobTitle: post.user_job_title,
        department: post.user_department
      }
    });
  } catch (error) {
    console.error('Error creating interest group post:', error);
    res.status(500).json({ message: 'Failed to create post' });
  }
});

export default router;