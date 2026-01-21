import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testAtlasConnection = async () => {
    try {
        console.log("🔌 Connecting to MongoDB Atlas...");
        console.log("URI:", process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')); // Hide password
        
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("✅ Connected to MongoDB Atlas successfully!");
        console.log("📊 Database:", mongoose.connection.db.databaseName);
        
        // List collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("📁 Collections:", collections.map(c => c.name).join(', '));
        
        await mongoose.disconnect();
        console.log("👋 Disconnected");
    } catch (error) {
        console.error("❌ Connection failed:", error.message);
    }
};

testAtlasConnection();
