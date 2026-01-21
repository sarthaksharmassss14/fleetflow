import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';

dotenv.config();

const resetPassword = async () => {
    try {
        console.log("🔌 Connecting to Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const email = 'abcd@gmail.com';
        const user = await User.findOne({ email });

        if (user) {
            // Hum passwordHash field set karenge aur save hook use hash kar dega
            user.passwordHash = '123456'; // Main password '123456' set kar raha hoon
            await user.save();
            console.log(`✅ Password for ${email} reset to: 123456`);
        } else {
            console.log(`❌ User ${email} not found in Atlas!`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

resetPassword();
