import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';

dotenv.config();

const bulkFixPasswords = async () => {
    let localConn, atlasConn;
    
    try {
        console.log("🔌 Connecting to both databases...");
        localConn = await mongoose.createConnection('mongodb://localhost:27017/fleetflow').asPromise();
        atlasConn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
        console.log("✅ Connections established!");

        const LocalUser = localConn.model('User', User.schema);
        
        // Fetch ALL local users with their hashes
        const localUsers = await LocalUser.find({}, 'email passwordHash');
        console.log(`Found ${localUsers.length} users to sync.`);

        // Use raw collection to bypass Mongoose "pre-save" hooks
        const atlasCollection = atlasConn.collection('users');

        for (const user of localUsers) {
            console.log(`🔧 Fixing hash for: ${user.email}...`);
            
            // Raw update bypasses middleware/hooks
            await atlasCollection.updateOne(
                { email: user.email },
                { $set: { passwordHash: user.passwordHash } }
            );
        }

        console.log("\n✅ ALL PASSWORDS SYNCED SUCCESSFULLY!");
        console.log("Ab aap apne purane passwords se login kar sakte hain.");

        await localConn.close();
        await atlasConn.close();
    } catch (error) {
        console.error("❌ Sync failed:", error.message);
        if (localConn) await localConn.close();
        if (atlasConn) await atlasConn.close();
    }
};

bulkFixPasswords();
