import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fleetflow";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for Debugging");

    const RoutePlan = mongoose.model('RoutePlan', new mongoose.Schema({}, { strict: false }));
    
    const routes = await RoutePlan.find({});
    console.log(`Found ${routes.length} routes.`);
    routes.forEach(r => {
        console.log({
            id: r._id,
            status: r.status,
            isArchived: r.isArchived,
            driverId: r.driverId,
            userId: r.userId
        });
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Debug failed:", error);
    process.exit(1);
  }
}

run();
