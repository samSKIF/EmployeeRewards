import { Router } from "express";
import { db } from "../../db";
import { interests, employeeInterests, employees, visibilityEnum } from "@shared/schema";
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
// GET /api/interests?query=...
router.get("/interests", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Interests microservice: Handling interests lookup");
    const { query } = req.query;
    
    let allInterests;
    if (query && typeof query === "string") {
      // Search for interests that match the query
      allInterests = await db
        .select()
        .from(interests)
        .where(ilike(interests.label, `%${query}%`))
        .limit(20);
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
      .from(employees)
      .where(eq(employees.id, employeeId));
      
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
    console.log("Interests microservice: Handling update employee interests");
    const employeeId = parseInt(req.params.id);
    const currentUserId = req.user?.id;
    
    // Check if the employee exists
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId));
      
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    
    // Check if the current user is authorized to update this employee's interests
    if (currentUserId !== employeeId) {
      return res.status(403).json({ message: "Not authorized to update this employee's interests" });
    }
    
    // Start a transaction to delete old interests and insert new ones
    const interestsData = req.body;
    
    // Transaction to update interests
    await db.transaction(async (tx) => {
      // Delete all existing interests for this employee
      await tx
        .delete(employeeInterests)
        .where(eq(employeeInterests.employeeId, employeeId));
      
      // Insert new interests
      for (const interest of interestsData) {
        let interestId = interest.interestId;
        
        // If no interestId is provided but customLabel is, create a new interest
        if (!interestId && interest.customLabel) {
          const [newInterest] = await tx
            .insert(interests)
            .values({
              label: interest.customLabel,
              category: "Custom", // Default category for custom interests
              icon: "✨" // Default icon for custom interests
            })
            .returning();
          
          interestId = newInterest.id;
        }
        
        // Skip if no valid interestId
        if (!interestId) continue;
        
        // Insert the employee interest relation
        await tx
          .insert(employeeInterests)
          .values({
            employeeId,
            interestId,
            customLabel: interest.customLabel,
            isPrimary: interest.isPrimary,
            visibility: interest.visibility
          });
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

export default router;