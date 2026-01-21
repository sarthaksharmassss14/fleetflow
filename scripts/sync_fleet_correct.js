import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const syncFleetToAtlas = async () => {
    try {
        console.log("🔌 Connecting to Atlas...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find an admin user to link vehicles to
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            console.log("❌ No admin user found to link vehicles!");
            return;
        }
        console.log(`👤 Linking vehicles to user: ${adminUser.email}`);

        console.log("🧹 Cleaning old fleet data...");
        await Vehicle.deleteMany({});
        
        const vehicles = [
            { userId: adminUser._id, name: "Tata Ace Gold", reg: "KA01AB1234", type: "Mini Truck", capacity: "750 kg", fuel: "Diesel", mileage: "18 km/l", status: "Active" },
            { userId: adminUser._id, name: "Mahindra Bolero Pik-Up", reg: "MH02CD5678", type: "Pickup", capacity: "1.5 Ton", fuel: "CNG", mileage: "12 km/kg", status: "Active" },
            { userId: adminUser._id, name: "Ashok Leyland Dost", reg: "DL03EF9012", type: "Light Truck", capacity: "2.5 Ton", fuel: "Diesel", mileage: "14 km/l", status: "Active" },
            { userId: adminUser._id, name: "Swaraj Mazda", reg: "TN04GH3456", type: "Medium Truck", capacity: "5 Ton", fuel: "Diesel", mileage: "10 km/l", status: "Active" },
            { userId: adminUser._id, name: "Tata Intra V30", reg: "HR05IJ7890", type: "Mini Truck", capacity: "1.3 Ton", fuel: "Electric", mileage: "120 km/charge", status: "Active" },
            { userId: adminUser._id, name: "Eicher Pro 2049", reg: "WB06KL1234", type: "Light Truck", capacity: "3 Ton", fuel: "CNG", mileage: "9 km/kg", status: "Active" },
            { userId: adminUser._id, name: "BharatBenz 1217C", reg: "UP07MN5678", type: "Heavy Truck", capacity: "12 Ton", fuel: "Diesel", mileage: "6 km/l", status: "Active" },
            { userId: adminUser._id, name: "Mahindra Supro", reg: "GJ08OP9012", type: "Van", capacity: "1 Ton", fuel: "Diesel", mileage: "20 km/l", status: "Active" }
        ];

        await Vehicle.insertMany(vehicles);
        console.log(`✅ ${vehicles.length} Indian Vehicles synced to Atlas successfully!`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("❌ Error:", error.message);
    }
};

syncFleetToAtlas();
