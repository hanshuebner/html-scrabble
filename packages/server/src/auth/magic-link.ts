import * as jose from 'jose';
import { config } from '../config.js';

const secret = new TextEncoder().encode(config.jwtSecret);

export async function createMagicLinkToken(email: string): Promise<string> {
  return new jose.SignJWT({ email, purpose: 'magic-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.magicLinkExpiry}s`)
    .sign(secret);
}

export async function verifyMagicLinkToken(token: string): Promise<{ email: string }> {
  const { payload } = await jose.jwtVerify(token, secret);
  if (payload.purpose !== 'magic-link') {
    throw new Error('invalid token purpose');
  }
  return { email: payload.email as string };
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new jose.SignJWT({ userId, email, purpose: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.sessionExpiry}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ userId: string; email: string }> {
  const { payload } = await jose.jwtVerify(token, secret);
  if (payload.purpose !== 'session') {
    throw new Error('invalid token purpose');
  }
  return {
    userId: payload.userId as string,
    email: payload.email as string,
  };
}
