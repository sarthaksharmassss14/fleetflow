
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const addFleetVehicles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Find user (Sarthak/xyz)
        const user = await User.findOne({ email: { $regex: 'sarthak', $options: 'i' } }) || await User.findOne({});
        
        if (!user) {
            console.log("No user found!");
            return;
        }

        console.log(`Adding vehicles for user: ${user.name} (${user._id})`);

        const vehicles = [
            {
                userId: user._id,
                name: 'Tata Ace Gold',
                reg: 'DL01AB1234',
                type: 'Mini Truck',
                capacity: '750 kg',
                fuel: 'Diesel',
                mileage: '18 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Mahindra Bolero Pickup',
                reg: 'UP14CD5678',
                type: 'Pickup',
                capacity: '1200 kg',
                fuel: 'Diesel',
                mileage: '14 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Ashok Leyland Dost',
                reg: 'HR26EF9012',
                type: 'Light Truck',
                capacity: '1500 kg',
                fuel: 'Diesel',
                mileage: '16 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Eicher Pro 1049',
                reg: 'RJ14GH3456',
                type: 'Medium Truck',
                capacity: '4900 kg',
                fuel: 'Diesel',
                mileage: '10 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Tata 407 Gold SFC',
                reg: 'MH12IJ7890',
                type: 'Light Truck',
                capacity: '2500 kg',
                fuel: 'Diesel',
                mileage: '12 km/l',
                status: 'Maintenance'
            },
            {
                userId: user._id,
                name: 'Maruti Super Carry',
                reg: 'GJ01KL2345',
                type: 'Mini Van',
                capacity: '800 kg',
                fuel: 'CNG',
                mileage: '22 km/kg',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Force Traveller',
                reg: 'KA03MN6789',
                type: 'Passenger Van',
                capacity: '12 seats',
                fuel: 'Diesel',
                mileage: '13 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Mahindra Supro',
                reg: 'TN09OP1234',
                type: 'Mini Van',
                capacity: '600 kg',
                fuel: 'Diesel',
                mileage: '20 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Bharat Benz 1215R',
                reg: 'AP28QR5678',
                type: 'Heavy Truck',
                capacity: '7500 kg',
                fuel: 'Diesel',
                mileage: '8 km/l',
                status: 'Active'
            },
            {
                userId: user._id,
                name: 'Piaggio Ape Auto',
                reg: 'WB19ST9012',
                type: 'Three Wheeler',
                capacity: '500 kg',
                fuel: 'Petrol',
                mileage: '35 km/l',
                status: 'Active'
            }
        ];

        // Delete existing vehicles to avoid duplicates
        await Vehicle.deleteMany({ userId: user._id });
        console.log("Cleared existing vehicles");

        // Insert new vehicles
        const result = await Vehicle.insertMany(vehicles);
        console.log(`✅ Successfully added ${result.length} vehicles to fleet!`);

        // Display summary
        console.log("\n📊 Fleet Summary:");
        result.forEach((v, idx) => {
            console.log(`${idx + 1}. ${v.name} (${v.reg}) - ${v.type} - ${v.capacity}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

addFleetVehicles();
