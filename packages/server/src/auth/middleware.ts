import type { Request, Response, NextFunction } from 'express'
import { verifySessionToken } from './magic-link.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { userId: string; email: string }
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.session
  if (!token) {
    res.status(401).json({ error: 'not authenticated' })
    return
  }

  try {
    req.user = await verifySessionToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'invalid session' })
  }
}

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const token = req.cookies?.session
  if (token) {
    try {
      req.user = await verifySessionToken(token)
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next()
}
