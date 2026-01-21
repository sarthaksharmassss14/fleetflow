import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const cleanAndAddFleet = async () => {
    try {
        console.log("🔌 Connecting to Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log("🧹 Cleaning old fleet data...");
        await Vehicle.deleteMany({});
        
        console.log("🚛 Adding fresh Indian Fleet...");
        const vehicles = [
            { registrationNumber: "KA01AB1234", type: "Mini Truck", capacity: 1500, fuelType: "Diesel", status: "Available" },
            { registrationNumber: "MH02CD5678", type: "Pickup", capacity: 2500, fuelType: "CNG", status: "Available" },
            { registrationNumber: "DL03EF9012", type: "Light Truck", capacity: 5000, fuelType: "Diesel", status: "Available" },
            { registrationNumber: "TN04GH3456", type: "Medium Truck", capacity: 10000, fuelType: "Diesel", status: "Available" },
            { registrationNumber: "HR05IJ7890", type: "Heavy Truck", capacity: 25000, fuelType: "Diesel", status: "Available" },
            { registrationNumber: "WB06KL1234", type: "Electric Van", capacity: 1000, fuelType: "Electric", status: "Available" },
            { registrationNumber: "UP07MN5678", type: "Container", capacity: 35000, fuelType: "Diesel", status: "Available" },
            { registrationNumber: "GJ08OP9012", type: "Tanker", capacity: 20000, fuelType: "Diesel", status: "Available" }
        ];

        await Vehicle.insertMany(vehicles);
        console.log(`✅ ${vehicles.length} Vehicles added to Atlas successfully!`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

cleanAndAddFleet();
