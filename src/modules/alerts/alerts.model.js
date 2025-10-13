import mongoose from 'mongoose'

const { Schema } = mongoose

const alertSchema = new Schema(
  {
    routeId: { type: Schema.Types.ObjectId, ref: 'Route', required: false },
    tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: false },
  operatorId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], required: true, index: true },
    message: { type: String, required: true },
    validFrom: { type: Date, required: true, index: true },
    validTo: { type: Date, required: true, index: true },
  },
  { timestamps: true }
)

export const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema)
export default Alert
