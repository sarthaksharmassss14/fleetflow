import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';

dotenv.config();

const deleteTestUser = async () => {
    try {
        console.log("🔌 Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected!");

        // Delete test user
        const result = await User.deleteOne({ email: 'qwerty@gmail.com' });
        
        if (result.deletedCount > 0) {
            console.log("✅ Test user deleted!");
            console.log("📧 Deleted: qwerty@gmail.com");
        } else {
            console.log("⚠️ Test user not found");
        }

        await mongoose.disconnect();
        console.log("👋 Done!");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

deleteTestUser();
