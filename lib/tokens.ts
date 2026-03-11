import crypto from "crypto"

export function createSecureToken(length = 32) {
  return crypto.randomBytes(length).toString("hex")
}

export function createExpiryDate(hours = 48) {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date
}