import mongoose from 'mongoose'

const { Schema } = mongoose

const USER_ROLES = ['admin', 'operator', 'commuter']

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'commuter', index: true },
    operatorId: { type: Schema.Types.ObjectId, required: false },
  },
  { timestamps: true }
)

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export default User
export { USER_ROLES }
