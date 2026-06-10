import mongoose from "mongoose";

const IntegrationSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, unique: true }, // "bling"
    access_token: { type: String, required: true },
    refresh_token: { type: String, required: true },
    expires_at: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: "integrations",
  },
);

const Integration = mongoose.model("Integration", IntegrationSchema);

export default Integration;
