import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const RoutePlan = mongoose.model('RoutePlan', new mongoose.Schema({}, { strict: false }));
    
    // Set isArchived: false for all documents where it is missing
    const res = await RoutePlan.updateMany(
      { isArchived: { $exists: false } }, 
      { $set: { isArchived: false } }
    );
    
    console.log("Migration result:", res);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
