import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const verifyFleet = async () => {
    try {
        console.log("🔌 Connecting to Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const count = await Vehicle.countDocuments();
        console.log(`📊 Total Vehicles in Atlas: ${count}`);
        
        const vehicles = await Vehicle.find().limit(5);
        if (vehicles.length > 0) {
            console.log("✅ Sample Vehicles found:");
            vehicles.forEach(v => console.log(` - ${v.registrationNumber} (${v.type})`));
        } else {
            console.log("❌ NO VEHICLES FOUND IN ATLAS!");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

verifyFleet();
