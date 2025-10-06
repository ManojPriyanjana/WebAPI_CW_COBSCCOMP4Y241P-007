import mongoose from 'mongoose'

const BusSchema = new mongoose.Schema(
  {
    regNo: { type: String, required: true, unique: true, index: true },
    operator: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Bus', BusSchema)
