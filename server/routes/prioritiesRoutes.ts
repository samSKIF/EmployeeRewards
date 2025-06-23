import { Router } from "express";
import { verifyToken, AuthenticatedRequest } from "../middleware/auth";
import { db } from "../db";
import { eq } from "drizzle-orm";

const router = Router();

// Mock priorities table structure (add to schema later if needed)
interface Priority {
  id: number;
  userId: number;
  text: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/priorities - Get user priorities
router.get("/", async (req, res) => {
  try {
    // For now, return mock data - replace with actual DB query
    const mockPriorities = [
      { id: 1, text: "Camping trip for the department", completed: false },
      { id: 2, text: "Complete Q4 performance reviews", completed: false },
      { id: 3, text: "Update team documentation", completed: true }
    ];

    res.json(mockPriorities);
  } catch (error) {
    console.error("Error fetching priorities:", error);
    res.status(500).json({ message: "Failed to fetch priorities" });
  }
});

// POST /api/priorities - Add new priority
router.post("/", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: "Priority text is required" });
    }

    // Mock response - replace with actual DB insert
    const newPriority = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json(newPriority);
  } catch (error) {
    console.error("Error adding priority:", error);
    res.status(500).json({ message: "Failed to add priority" });
  }
});

// PUT /api/priorities/:id - Update priority
router.put("/:id", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;

    // Mock response - replace with actual DB update
    const updatedPriority = {
      id: parseInt(id),
      text,
      completed,
      updatedAt: new Date()
    };

    res.json(updatedPriority);
  } catch (error) {
    console.error("Error updating priority:", error);
    res.status(500).json({ message: "Failed to update priority" });
  }
});

export default router;