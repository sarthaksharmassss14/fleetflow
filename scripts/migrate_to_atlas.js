import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Models
import User from './server/models/User.model.js';
import RoutePlan from './server/models/RoutePlan.model.js';
import Vehicle from './server/models/Vehicle.model.js';
import Delivery from './server/models/Delivery.model.js';
import RealTimeUpdate from './server/models/RealTimeUpdate.model.js';

const migrateData = async () => {
    let localConn, atlasConn;
    
    try {
        console.log("🔌 Connecting to LOCAL MongoDB...");
        localConn = await mongoose.createConnection('mongodb://localhost:27017/fleetflow').asPromise();
        console.log("✅ Connected to LOCAL");

        console.log("🔌 Connecting to ATLAS MongoDB...");
        atlasConn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
        console.log("✅ Connected to ATLAS");

        // Get models from both connections
        const LocalUser = localConn.model('User', User.schema);
        const LocalRoute = localConn.model('RoutePlan', RoutePlan.schema);
        const LocalVehicle = localConn.model('Vehicle', Vehicle.schema);
        const LocalDelivery = localConn.model('Delivery', Delivery.schema);
        const LocalRealTime = localConn.model('RealTimeUpdate', RealTimeUpdate.schema);

        const AtlasUser = atlasConn.model('User', User.schema);
        const AtlasRoute = atlasConn.model('RoutePlan', RoutePlan.schema);
        const AtlasVehicle = atlasConn.model('Vehicle', Vehicle.schema);
        const AtlasDelivery = atlasConn.model('Delivery', Delivery.schema);
        const AtlasRealTime = atlasConn.model('RealTimeUpdate', RealTimeUpdate.schema);

        // Migrate Users
        console.log("\n👥 Migrating Users...");
        const localUsers = await LocalUser.find({});
        console.log(`Found ${localUsers.length} users in local DB`);
        
        if (localUsers.length > 0) {
            // Clear existing users in Atlas (optional - comment out if you want to keep existing)
            // await AtlasUser.deleteMany({});
            
            for (const user of localUsers) {
                const existingUser = await AtlasUser.findOne({ email: user.email });
                if (!existingUser) {
                    await AtlasUser.create(user.toObject());
                    console.log(`✅ Migrated user: ${user.email}`);
                } else {
                    console.log(`⚠️ User already exists: ${user.email}`);
                }
            }
        }

        // Migrate Vehicles
        console.log("\n🚛 Migrating Vehicles...");
        const localVehicles = await LocalVehicle.find({});
        console.log(`Found ${localVehicles.length} vehicles in local DB`);
        
        if (localVehicles.length > 0) {
            await AtlasVehicle.deleteMany({}); // Clear existing
            await AtlasVehicle.insertMany(localVehicles.map(v => v.toObject()));
            console.log(`✅ Migrated ${localVehicles.length} vehicles`);
        }

        // Migrate Deliveries
        console.log("\n📦 Migrating Deliveries...");
        const localDeliveries = await LocalDelivery.find({});
        console.log(`Found ${localDeliveries.length} deliveries in local DB`);
        
        if (localDeliveries.length > 0) {
            await AtlasDelivery.deleteMany({}); // Clear existing
            await AtlasDelivery.insertMany(localDeliveries.map(d => d.toObject()));
            console.log(`✅ Migrated ${localDeliveries.length} deliveries`);
        }

        // Migrate Routes
        console.log("\n🗺️ Migrating Routes...");
        const localRoutes = await LocalRoute.find({});
        console.log(`Found ${localRoutes.length} routes in local DB`);
        
        if (localRoutes.length > 0) {
            await AtlasRoute.deleteMany({}); // Clear existing
            await AtlasRoute.insertMany(localRoutes.map(r => r.toObject()));
            console.log(`✅ Migrated ${localRoutes.length} routes`);
        }

        // Migrate RealTime Updates
        console.log("\n📡 Migrating RealTime Updates...");
        const localRealTime = await LocalRealTime.find({});
        console.log(`Found ${localRealTime.length} realtime updates in local DB`);
        
        if (localRealTime.length > 0) {
            await AtlasRealTime.deleteMany({}); // Clear existing
            await AtlasRealTime.insertMany(localRealTime.map(rt => rt.toObject()));
            console.log(`✅ Migrated ${localRealTime.length} realtime updates`);
        }

        // Summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 MIGRATION SUMMARY");
        console.log("=".repeat(50));
        console.log(`👥 Users: ${localUsers.length}`);
        console.log(`🚛 Vehicles: ${localVehicles.length}`);
        console.log(`📦 Deliveries: ${localDeliveries.length}`);
        console.log(`🗺️ Routes: ${localRoutes.length}`);
        console.log(`📡 RealTime Updates: ${localRealTime.length}`);
        console.log("=".repeat(50));
        console.log("✅ Migration completed successfully!");

        await localConn.close();
        await atlasConn.close();
        console.log("👋 Connections closed");

    } catch (error) {
        console.error("❌ Migration failed:", error.message);
        console.error(error);
        
        if (localConn) await localConn.close();
        if (atlasConn) await atlasConn.close();
    }
};

migrateData();
