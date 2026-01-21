
import mongoose from "mongoose";
import dotenv from "dotenv";
import RoutePlan from "./server/models/RoutePlan.model.js";

dotenv.config();

const restoreRoutes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for Restoration");

    // 1. Restore all 'active' and 'in-progress' routes that are archived
    const resultLive = await RoutePlan.updateMany(
        { status: { $in: ['active', 'in-progress'] }, isArchived: true },
        { $set: { isArchived: false } }
    );
    console.log(`Restored LIVE Routes: ${resultLive.modifiedCount}`);

    // 2. Restore all 'completed' routes that are archived (if any)
    const resultCompleted = await RoutePlan.updateMany(
        { status: 'completed', isArchived: true },
        { $set: { isArchived: false } }
    );
    console.log(`Restored COMPLETED Routes: ${resultCompleted.modifiedCount}`);

    mongoose.disconnect();
  } catch (err) {
    console.error("Restoration Error:", err);
  }
};

restoreRoutes();
