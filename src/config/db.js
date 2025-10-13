import mongoose from 'mongoose'
import { baseLogger } from '../middleware/logger.js'

export async function connectDB() {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('MONGO_URI is not set in environment')
  }
  try {
    await mongoose.connect(uri)
    baseLogger.info('MongoDB connected')
  } catch (err) {
    baseLogger.error({ err }, 'MongoDB connection error')
    throw err
  }
}
