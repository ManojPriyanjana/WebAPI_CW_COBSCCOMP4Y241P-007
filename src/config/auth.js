import dotenv from 'dotenv'

dotenv.config()

const { JWT_PRIVATE_KEY, JWT_PUBLIC_KEY } = process.env

if (!JWT_PRIVATE_KEY || !JWT_PUBLIC_KEY) {
  // Defer throwing at startup to allow SKIP_DB or other flows; services should validate before signing
  console.warn(
    '[auth] JWT keys not set. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in env for RS256 tokens.'
  )
}

export const authConfig = {
  privateKey: JWT_PRIVATE_KEY,
  publicKey: JWT_PUBLIC_KEY,
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
}

export default authConfig
