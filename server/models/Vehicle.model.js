import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    reg: {
      type: String, // Registration Number (e.g., DL-1L-8921)
      required: true,
      unique: true,
    },
    type: {
      type: String, // e.g., Mini Truck, Pickup, Van
      required: true,
    },
    capacity: {
      type: String, // e.g., 750 kg
      required: true,
    },
    fuel: {
      type: String, // e.g., Diesel, CNG
      required: true,
    },
    mileage: {
      type: String, // e.g., 18 km/l
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Maintenance", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Vehicle", vehicleSchema);
