import crypto from "crypto"

export function createSecureToken(length = 32) {
  const bytes = Math.max(16, Math.ceil(length))
  return crypto.randomBytes(bytes).toString("hex")
}

export function createExpiryDate(hours = 72) {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + hours)
  return expiresAt
}