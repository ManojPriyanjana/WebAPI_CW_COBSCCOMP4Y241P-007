import { asyncHandler } from '../../middleware/errors.js'
import * as service from './users.service.js'

export const patchUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body || {}
  const result = await service.updateRole({
    targetUserId: req.params.id,
    nextRole: role,
    actor: req.user,
  })
  res.json({ data: result })
})
