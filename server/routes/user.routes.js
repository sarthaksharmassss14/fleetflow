import express from "express";
import User from "../models/User.model.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin sees all, dispatcher sees drivers)
router.get("/", async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "dispatcher") {
       query = { role: "driver" };
    } else if (req.user.role !== "admin") {
       return res.status(403).json({ success: false, message: "Access denied" });
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Users can only view their own profile unless admin
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update user
router.patch("/:id", async (req, res) => {
  try {
    const { name, role, isActive } = req.body;

    // Check permissions
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Only admin can change role and status
    const updateData = { name };
    if (req.user.role === "admin") {
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-passwordHash");

    res.json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
