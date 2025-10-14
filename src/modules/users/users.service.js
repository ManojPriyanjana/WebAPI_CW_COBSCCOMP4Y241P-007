import createError from 'http-errors'
import mongoose from 'mongoose'
import User, { USER_ROLES } from './users.model.js'

function ensureAdmin(actor) {
  if (!actor) throw createError(401, 'unauthorized')
  if (actor.role !== 'admin') throw createError(403, 'forbidden')
}

function validateRole(role) {
  if (!role) throw createError(422, 'role is required')
  if (!USER_ROLES.includes(role)) {
    throw createError(422, 'role must be one of admin, operator, commuter')
  }
  return role
}

function ensureObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(422, 'id must be a valid ObjectId')
  }
  return id
}

export async function updateRole({ targetUserId, nextRole, actor }) {
  ensureAdmin(actor)
  const role = validateRole(nextRole)
  const userId = ensureObjectId(targetUserId)

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true, lean: true }
  )

  if (!updated) throw createError(404, 'user not found')

  return {
    _id: updated._id,
    email: updated.email,
    role: updated.role,
    operatorId: updated.operatorId,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  }
}
