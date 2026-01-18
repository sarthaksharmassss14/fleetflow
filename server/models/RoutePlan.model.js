import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  address: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number,
  },
  timeWindow: {
    start: String,
    end: String,
  },
  priority: {
    type: String,
    enum: ["low", "normal", "medium", "high", "urgent"],
    default: "normal",
  },
  packageDetails: {
    weight: Number,
    volume: Number,
    type: String,
  },
});

const routePlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveries: [deliverySchema],
    route: [
      {
        address: String,
        priority: String,
        timeWindow: String,
        packageDetails: Object,
        coordinates: {
          lat: Number,
          lng: Number,
        },
        order: Number,
      },
    ],
    estimatedTime: {
      type: Number,
      default: 0,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },
    fuelRequiredLitres: Number,
    dieselPriceUsed: Number,
    costBreakdown: {
      fuel: { type: Number, default: 0 },
      time: { type: Number, default: 0 },
      maintenance: { type: Number, default: 0 },
      tolls: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    routeLegs: [
      {
        from: String,
        to: String,
        distanceKm: Number,
        timeMins: Number
      }
    ],
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled"],
      default: "draft",
    },
    reasoning: String,
    vehicleData: {
      type: {
        type: String,
        default: "van",
      },
      capacity: {
        type: Number,
        default: 1000,
      },
      fuelEfficiency: {
        type: Number,
        default: 25,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("RoutePlan", routePlanSchema);
