
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.model.js';
import Vehicle from './server/models/Vehicle.model.js';

dotenv.config();

const fixVehicles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Find Sarthak (assuming email or just the first user/admin)
        const user = await User.findOne({ email: { $regex: 'sarthak', $options: 'i' } }) || await User.findOne({});
        
        if (!user) {
            console.log("No user found!");
            return;
        }

        console.log(`Assigning vehicles to user: ${user.name} (${user._id})`);

        const result = await Vehicle.updateMany({}, { $set: { userId: user._id } });
        console.log(`Updated ${result.modifiedCount} vehicles.`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
};

fixVehicles();
