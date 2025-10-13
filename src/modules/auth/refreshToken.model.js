import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  {
    collection: 'refreshTokens',
  }
)

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema)

export default RefreshToken

