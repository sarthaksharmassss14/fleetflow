
import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      default: "Unknown"
    },
    address: { 
      type: String, 
      required: true 
    },
    timeWindow: { 
      type: String, 
      default: "Anytime" 
    },
    priority: {
      type: String,
      enum: ["low", "normal", "medium", "high", "urgent"],
      default: "normal",
    },
    packageDetails: {
      weight: { type: Number, default: 0 },
      volume: { type: Number, default: 0 },
      type: { type: String, default: "Box" },
    },
    status: {
      type: String,
      enum: ["pending", "assigned", "delivered", "failed"],
      default: "pending",
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoutePlan",
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Delivery", deliverySchema);
