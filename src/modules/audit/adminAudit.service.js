import AdminAudit from './adminAudit.model.js'
import { baseLogger } from '../../middleware/logger.js'

export async function recordAdminAudit({ actorId, action, targetType, targetId, meta }) {
  if (!actorId || !action || !targetType || !targetId) return
  const payload = { actorId, action, targetType, targetId, meta: serializeMeta(meta) }
  try {
    await AdminAudit.create(payload)
  } catch (err) {
    baseLogger.warn({ err, action, targetType }, 'failed to record admin audit entry')
  }
}

function serializeMeta(meta) {
  if (!meta) return undefined
  if (typeof meta !== 'object') return meta
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined)
  if (!entries.length) return undefined
  return Object.fromEntries(entries)
}

export default { recordAdminAudit }
