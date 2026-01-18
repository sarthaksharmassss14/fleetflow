import mongoose from "mongoose";

const realTimeUpdateSchema = new mongoose.Schema(
  {
    routePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoutePlan",
      required: true,
    },
    trafficData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    weatherData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    shouldReoptimize: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RealTimeUpdate", realTimeUpdateSchema);
