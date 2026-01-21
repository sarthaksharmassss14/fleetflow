
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const routePlanSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    costBreakdown: {
        fuel: Number,
        total: Number,
        time: Number,
        maintenance: Number,
        tolls: Number
    },
    createdAt: Date
}, { strict: false });

const RoutePlan = mongoose.model('RoutePlan', routePlanSchema);

async function checkRoutes() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI missing in .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const routes = await RoutePlan.find({}).sort({createdAt: -1}).limit(5);
        console.log(`Found ${routes.length} routes.`);
        
        routes.forEach((r, i) => {
            console.log(`Route ${i+1}: ID=${r._id}, Created=${r.createdAt}`);
            console.log("Cost Breakdown:", JSON.stringify(r.costBreakdown, null, 2));
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkRoutes();
