import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types/index';
import { adminDb } from './lib/firebase-admin';

const db = adminDb;

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

export async function createToken(user: User): Promise<string> {
  const token = `mq_${crypto.randomBytes(32).toString('hex')}`;
  // 7-day expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await db.collection('sessions').doc(token).set({ user, expiresAt });
  return token;
}

export async function getUserByToken(token: string): Promise<User | null> {
  if (!token) return null;
  const doc = await db.collection('sessions').doc(token).get();
  if (!doc.exists) return null;
  const session = doc.data() as { user: User; expiresAt: number };
  if (Date.now() > session.expiresAt) {
    await db.collection('sessions').doc(token).delete();
    return null;
  }
  return session.user;
}

export async function removeToken(token: string): Promise<void> {
  await db.collection('sessions').doc(token).delete();
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const user = await getUserByToken(token);
  if (!user || !user.is_active) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  req.user = user;
  next();
}

export function requireRoles(...roles: (UserRole | UserRole[])[]) {
  const allowedRoles: UserRole[] = roles.flat();
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access forbidden: Required role [${allowedRoles.join(', ')}], current role is [${req.user.role}].`,
      });
      return;
    }

    next();
  };
}

export const requireRole = requireRoles;
