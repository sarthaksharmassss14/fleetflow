import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { authenticate } from "../middleware/auth.middleware.js";
import passport from "passport";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      passwordHash: password,
      role: role || "dispatcher",
      companyId,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Complete Google OAuth Register
router.post("/google-complete", async (req, res) => {
  try {
    const { name, email, googleId, role } = req.body;

    // Check if user already exists (extra safety)
    const existingUser = await User.findOne({ 
      $or: [{ googleId }, { email }] 
    });
    
    if (existingUser) {
       // If they exist, just log them in
       const token = jwt.sign(
        { userId: existingUser._id, role: existingUser.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );
      return res.json({
        success: true,
        data: {
          user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role },
          token,
        },
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      googleId,
      role: role || "dispatcher",
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully via Google",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    try {
      console.log("[OAuth] Callback route hit. User found:", !!req.user);
      
      if (!req.user) {
        console.error("[OAuth] Authentication succeeded but req.user is missing");
        return res.redirect("/login?error=auth_failed");
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

      // If this is a new user, redirect to signup page to choose role
      if (req.user.isNewUser) {
        const query = new URLSearchParams({
          googleId: req.user.googleId,
          email: req.user.email,
          name: req.user.name,
          mode: 'oauth'
        }).toString();
        return res.redirect(`${clientUrl}/signup?${query}`);
      }

      // Existing user: Generate token
      const token = jwt.sign(
        { userId: req.user._id, role: req.user.role },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token
      const userData = encodeURIComponent(JSON.stringify({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }));
      
      res.redirect(`${clientUrl}/auth-success?token=${token}&user=${userData}`);
    } catch (error) {
      console.error("[OAuth] Error in callback handler:", error);
      res.redirect("/login?error=server_error");
    }
  }
);

    // Get current user
    router.get("/me", authenticate, async (req, res) => {
      res.json({
        success: true,
        data: {
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            companyId: req.user.companyId,
            subscription: req.user.subscription,
          },
        },
      });
    });

// Update Profile
router.put("/update-profile", authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (email) user.email = email;
    
    await user.save();
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reset Password
router.post("/reset-password", authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!await user.comparePassword(oldPassword)) {
      return res.status(400).json({ success: false, message: "Incorrect current password" });
    }
    
    user.passwordHash = newPassword; // Will be hashed by pre-save hook
    await user.save();
    
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
