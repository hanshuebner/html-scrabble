import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  createMagicLinkToken,
  verifyMagicLinkToken,
  createSessionToken,
} from './magic-link.js';
import { authMiddleware } from './middleware.js';
import { sendEmail } from '../email/email-service.js';
import { config } from '../config.js';

export const authRoutes = Router();

// In-memory user store (will be replaced by DB)
const users = new Map<string, { id: string; email: string; name: string }>();
let nextId = 1;

function findOrCreateUser(email: string, name?: string): { id: string; email: string; name: string } {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  const id = String(nextId++);
  const user = { id, email, name: name || email.split('@')[0] };
  users.set(id, user);
  return user;
}

function findUserById(id: string) {
  return users.get(id) || null;
}

// Request magic link
authRoutes.post('/magic-link', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'email required' });
      return;
    }

    const token = await createMagicLinkToken(email);
    const link = `${config.baseUrl}api/auth/verify?token=${token}`;

    await sendEmail(
      email,
      'Log in to Scrabble',
      `Click this link to log in:\n\n${link}`,
      `Click <a href="${link}">here</a> to log in.`,
    );

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Verify magic link and create session
authRoutes.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: 'token required' });
      return;
    }

    const { email } = await verifyMagicLinkToken(token);
    const user = findOrCreateUser(email);
    const sessionToken = await createSessionToken(user.id, user.email);

    res.cookie('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Redirect to the app
    res.redirect('/');
  } catch (e: any) {
    res.status(400).json({ error: 'invalid or expired link' });
  }
});

// Logout
authRoutes.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('session', { path: '/' });
  res.json({ ok: true });
});

// Get current user
authRoutes.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = findUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: 'user not found' });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});
