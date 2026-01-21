
import mongoose from "mongoose";
import dotenv from "dotenv";
import Delivery from "./server/models/Delivery.model.js";
import User from "./server/models/User.model.js";

dotenv.config();

const createTestDelivery = async () => {
  try {
    console.log("🛠️ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Custom Connection Successful");

    // Fetch ANY user to assign ownership (required by schema)
    const user = await User.findOne();
    if (!user) {
        console.error("❌ No users found in DB. Create a user first.");
        process.exit(1);
    }

    const testItem = new Delivery({
        userId: user._id,
        address: "Block B, Connaught Place, New Delhi",
        timeWindow: "10:00 - 12:00",
        priority: "urgent",
        packageDetails: {
            weight: 5.5,
            volume: 0.2,
            type: "Box"
        },
        status: "pending"
    });

    const saved = await testItem.save();
    console.log("📦 Test Delivery Created with ID:", saved._id);
    console.log("🚀 Collection 'deliveries' should now be visible in Atlas/Compass!");

    await mongoose.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

createTestDelivery();
