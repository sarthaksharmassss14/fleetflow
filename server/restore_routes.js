import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for Restoration");

    const RoutePlan = mongoose.model('RoutePlan', new mongoose.Schema({}, { strict: false }));
    
    // RESTORE ALL ROUTES: Set isArchived: false for EVERYONE
    const res = await RoutePlan.updateMany(
      {}, 
      { $set: { isArchived: false } }
    );
    
    console.log("Restoration result:", res);
    process.exit(0);
  } catch (error) {
    console.error("Restoration failed:", error);
    process.exit(1);
  }
}

run();
