
import mongoose from "mongoose";
import dotenv from "dotenv";
import RoutePlan from "./server/models/RoutePlan.model.js";

dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for Check");

    const allRoutes = await RoutePlan.find({});
    console.log(`Total Routes in DB: ${allRoutes.length}`);

    const activeRoutes = await RoutePlan.find({ isArchived: { $ne: true } });
    console.log(`Non-Archived Routes: ${activeRoutes.length}`);

    activeRoutes.forEach(r => {
        console.log(`- ID: ${r._id}, Status: ${r.status}, Archived: ${r.isArchived}, CreatedBy: ${r.userId}`);
    });

    const dispatcherView = await RoutePlan.find({ isArchived: { $ne: true } });
    console.log(`Dispatcher Query Result Count: ${dispatcherView.length}`);

    const archivedCompleted = await RoutePlan.find({ status: 'completed', isArchived: true });
    console.log(`Archived COMPLETED Routes: ${archivedCompleted.length}`);

    const archivedLive = await RoutePlan.find({ status: { $in: ['active', 'in-progress'] }, isArchived: true });
    console.log(`Archived LIVE Routes: ${archivedLive.length}`);

    mongoose.disconnect();
  } catch (err) {
    console.error("DB Check Error:", err);
  }
};

checkDB();
