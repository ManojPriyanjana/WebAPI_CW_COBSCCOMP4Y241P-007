import mongoose from 'mongoose'

const LocationUpdateSchema = new mongoose.Schema(
  {
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    ts: { type: Date, required: true, default: Date.now },
    location: {
      type: { type: String, enum: ['Point'], required: true, default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lon, lat]
    },
    speedKph: { type: Number, min: 0 },
    heading: { type: Number, min: 0, max: 360 },
    accuracyM: { type: Number, min: 0 },
  },
  { timestamps: true }
)

LocationUpdateSchema.index({ location: '2dsphere' })
LocationUpdateSchema.index({ busId: 1, ts: -1 })
LocationUpdateSchema.index({ busId: 1, createdAt: -1 })

export default mongoose.model('LocationUpdate', LocationUpdateSchema)
