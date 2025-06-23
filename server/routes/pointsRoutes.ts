import { Router } from "express";
import { verifyToken, verifyAdmin, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { logger } from "@shared/logger";

const router = Router();

// Award points to a user (admin only)
router.post("/earn", verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, amount, reason, description } = req.body;

    if (!userId || !amount || !reason || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const adminId = req.user?.id;

    // Award points to the user
    const transaction = await storage.earnPoints(userId, amount, reason, description, adminId);

    // Get updated balance
    const balance = await storage.getUserBalance(userId);

    res.json({
      transaction,
      balance
    });
  } catch (error: any) {
    logger.error("Error awarding points:", error);
    res.status(500).json({ message: error.message || "Failed to award points" });
  }
});

// Redeem points for a product
router.post("/redeem", verifyToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { amount, productId, description } = req.body;

    if (!amount || !productId || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Redeem points for the product
    const { transaction, order } = await storage.redeemPoints(
      req.user.id,
      amount,
      description,
      productId
    );

    // Get updated balance
    const balance = await storage.getUserBalance(req.user.id);

    res.json({
      transaction,
      order,
      balance
    });
  } catch (error: any) {
    logger.error("Error redeeming points:", error);
    res.status(500).json({ message: error.message || "Failed to redeem points" });
  }
});

// Get current user's points balance
router.get("/balance", async (req, res) => {
  try {
    // Return mock data for testing
    const mockBalance = {
      balance: 1250,
      weeklyPoints: 75,
      total: 1250,
      week: 75
    };
    
    res.json(mockBalance);
  } catch (error) {
    console.error("Error fetching points balance:", error);
    res.status(500).json({ message: "Failed to fetch points balance" });
  }
});

export default router;