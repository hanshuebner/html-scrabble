import * as jose from 'jose'
import { config } from '../config.js'

const secret = new TextEncoder().encode(config.jwtSecret)

export const createMagicLinkToken = async (email: string): Promise<string> => {
  return new jose.SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.magicLinkExpiry}s`)
    .sign(secret)
}

export const verifyMagicLinkToken = async (token: string): Promise<{ email: string }> => {
  const { payload } = await jose.jwtVerify(token, secret)
  if (payload.purpose !== 'magic-link') {
    throw new Error('invalid token purpose')
  }
  return { email: payload.email as string }
}

export const createSessionToken = async (userId: string, email: string): Promise<string> => {
  return new jose.SignJWT({ userId, email, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.sessionExpiry}s`)
    .sign(secret)
}

export const verifySessionToken = async (token: string): Promise<{ userId: string; email: string }> => {
  const { payload } = await jose.jwtVerify(token, secret)
  if (payload.purpose !== 'session') {
    throw new Error('invalid token purpose')
  }
  return {
    userId: payload.userId as string,
    email: payload.email as string,
  }
}
