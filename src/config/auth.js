import dotenv from 'dotenv'

dotenv.config()

const { JWT_PRIVATE_KEY, JWT_PUBLIC_KEY } = process.env

// When a PEM is stored in an env file it's common to escape newlines as "\\n".
// Convert those sequences to real newlines so signing/verifying libraries work.
const normalizePem = (val) => (val ? val.replace(/\\n/g, '\n') : val)

if (!JWT_PRIVATE_KEY || !JWT_PUBLIC_KEY) {
  // Defer throwing at startup to allow SKIP_DB or other flows; services should validate before signing
  console.warn(
    '[auth] JWT keys not set. Set JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in env for RS256 tokens.'
  )
}

export const authConfig = {
  privateKey: normalizePem(JWT_PRIVATE_KEY),
  publicKey: normalizePem(JWT_PUBLIC_KEY),
  accessTokenTtl: '15m',
  refreshTokenTtl: '7d',
}

export default authConfig
