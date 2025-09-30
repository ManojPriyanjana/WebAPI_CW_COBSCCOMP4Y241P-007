import mongoose from 'mongoose'

const RoutesSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    provinceFrom: { type: String, required: true },
    provinceTo: { type: String, required: true },
    distanceKm: { type: Number, required: true }
  },
  { timestamps: true }
)

export default mongoose.model('Route', RoutesSchema)
