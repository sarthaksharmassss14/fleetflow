
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const checkVehicles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const count = await Vehicle.countDocuments();
        console.log(`Total Vehicles: ${count}`);

        const vehicles = await Vehicle.find({});
        console.log("Vehicles:", vehicles);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

checkVehicles();
