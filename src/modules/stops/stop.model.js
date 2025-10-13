import mongoose from 'mongoose'

const StopSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    province: { type: String },
  },
  { timestamps: true }
)

export default mongoose.model('Stop', StopSchema)
