import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';

dotenv.config();

const createTestUser = async () => {
    try {
        console.log("🔌 Connecting to MongoDB Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected!");

        // Check if user exists
        const existingUser = await User.findOne({ email: 'qwerty@gmail.com' });
        
        if (existingUser) {
            console.log("👤 User already exists!");
            console.log("Email:", existingUser.email);
            console.log("Name:", existingUser.name);
            console.log("Role:", existingUser.role);
            
            // Update password to 'qwerty' (will be hashed by pre-save hook)
            existingUser.passwordHash = 'qwerty';
            await existingUser.save();
            console.log("🔑 Password updated to: qwerty");
        } else {
            // Create new user (password will be hashed by pre-save hook)
            const newUser = new User({
                name: 'Test User',
                email: 'qwerty@gmail.com',
                passwordHash: 'qwerty',
                role: 'admin'
            });

            await newUser.save();
            console.log("✅ Test user created!");
            console.log("📧 Email: qwerty@gmail.com");
            console.log("🔑 Password: qwerty");
            console.log("👑 Role: admin");
        }

        await mongoose.disconnect();
        console.log("👋 Done!");
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

createTestUser();
