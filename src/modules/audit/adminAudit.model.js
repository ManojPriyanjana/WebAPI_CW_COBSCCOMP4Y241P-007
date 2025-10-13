import mongoose from 'mongoose'

const adminAuditSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    at: { type: Date, default: Date.now, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    collection: 'adminAudits',
  }
)

adminAuditSchema.index({ targetType: 1, targetId: 1, at: -1 })
adminAuditSchema.index({ actorId: 1, at: -1 })

const AdminAudit = mongoose.model('AdminAudit', adminAuditSchema)

export default AdminAudit

