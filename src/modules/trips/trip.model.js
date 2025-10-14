import mongoose from 'mongoose'

const TripSchema = new mongoose.Schema(
  {
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    fromStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    toStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
    serviceDate: { type: Date, required: true },
    schedDepart: { type: Date, required: true },
    schedArrive: { type: Date, required: true },
    status: { type: String, enum: ['SCHEDULED', 'ONGOING', 'COMPLETED'], default: 'SCHEDULED' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
)

export default mongoose.model('Trip', TripSchema)
