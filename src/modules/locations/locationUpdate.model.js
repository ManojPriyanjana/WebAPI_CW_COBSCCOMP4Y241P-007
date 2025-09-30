import mongoose from 'mongoose'

const LocationUpdateSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    ts: { type: Date, required: true, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lon, lat]
    },
    speedKph: { type: Number, required: true },
  },
  { timestamps: true }
)

LocationUpdateSchema.index({ location: '2dsphere' })

export default mongoose.model('LocationUpdate', LocationUpdateSchema)
