
import express from "express";
import Delivery from "../models/Delivery.model.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { apiRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Middleware
router.use(authenticate);
router.use(apiRateLimiter);

// 1. Get All Deliveries (with filters)
router.get("/", async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};
    
    // User Isolation: Users can only see deliveries they created (or all if admin)
    if (req.user.role !== 'admin') {
       query.userId = req.user._id;
    }

    if (status) query.status = status;
    if (type) query["packageDetails.type"] = type;

    const deliveries = await Delivery.find(query).sort({ createdAt: -1 });
    
    res.json({ success: true, count: deliveries.length, data: deliveries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Create New Delivery (Single)
router.post("/", async (req, res) => {
  try {
    const delivery = new Delivery({
      ...req.body,
      userId: req.user._id, // Auto-assign creator
      status: 'pending'
    });
    
    const saved = await delivery.save();
    res.status(201).json({ success: true, message: "Delivery added to warehouse", data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. Update Delivery
router.patch("/:id", async (req, res) => {
  try {
    let query = { _id: req.params.id };
    // If not admin, restrict to own data
    if (req.user.role !== 'admin') {
        query.userId = req.user._id;
    }

    const delivery = await Delivery.findOne(query);
    
    if (!delivery) {
        return res.status(404).json({ success: false, message: "Delivery not found or unauthorized" });
    }

    Object.assign(delivery, req.body);
    const updated = await delivery.save();
    
    res.json({ success: true, message: "Delivery updated", data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 4. Delete Delivery
router.delete("/:id", async (req, res) => {
  try {
     let query = { _id: req.params.id };
     if (req.user.role !== 'admin') {
        query.userId = req.user._id;
     }

     const result = await Delivery.deleteOne(query);
     
     if (result.deletedCount === 0) {
         return res.status(404).json({ success: false, message: "Delivery not found or unauthorized" });
     }
     res.json({ success: true, message: "Delivery removed from warehouse" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
