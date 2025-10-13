import mongoose from 'mongoose'

const StopSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords) => Array.isArray(coords) && coords.length === 2,
          message: 'location.coordinates must be a [lng, lat] pair',
        },
      },
    },
  },
  { timestamps: true }
)

StopSchema.index({ location: '2dsphere' })

export default mongoose.model('Stop', StopSchema)
