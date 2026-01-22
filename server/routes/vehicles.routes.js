import express from "express";
import Vehicle from "../models/Vehicle.model.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all vehicles (Shared fleet for all roles)
router.get("/", authenticate, async (req, res) => {
  try {
    // Vehicles are shared across the platform
    const vehicles = await Vehicle.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add a new vehicle
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, reg, type, capacity, fuel, mileage, status } = req.body;

    // Check if regression number already exists
    const existingVehicle = await Vehicle.findOne({ reg });
    if (existingVehicle) {
        return res.status(400).json({ success: false, message: "Vehicle with this registration number already exists." });
    }

    const newVehicle = new Vehicle({
      userId: req.user._id,
      name,
      reg,
      type,
      capacity,
      fuel,
      mileage,
      status: status || "Active",
    });

    await newVehicle.save();
    res.status(201).json({ success: true, data: newVehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update a vehicle
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, reg, type, capacity, fuel, mileage, status } = req.body;
    
    // Check ownership or admin role
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
        query.userId = req.user._id;
    }
    const vehicle = await Vehicle.findOne(query);
    if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found or unauthorized" });
    }

    vehicle.name = name || vehicle.name;
    vehicle.reg = reg || vehicle.reg;
    vehicle.type = type || vehicle.type;
    vehicle.capacity = capacity || vehicle.capacity;
    vehicle.fuel = fuel || vehicle.fuel;
    vehicle.mileage = mileage || vehicle.mileage;
    vehicle.status = status || vehicle.status;

    await vehicle.save();
    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete a vehicle
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
        query.userId = req.user._id;
    }
    const result = await Vehicle.deleteOne(query);
    
    if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: "Vehicle not found or unauthorized" });
    }

    res.json({ success: true, message: "Vehicle deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
