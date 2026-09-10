import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../src/types/index';

const SESSIONS_FILE = path.join(process.cwd(), 'data', 'sessions.json');

// In-memory or persisted token registry
let activeSessions = new Map<string, { user: User; expiresAt: number }>();

// Load sessions from disk on startup
function loadSessions() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      activeSessions = new Map(Object.entries(data));
      // Clean up expired sessions on load
      const now = Date.now();
      for (const [token, session] of activeSessions.entries()) {
        if (now > session.expiresAt) {
          activeSessions.delete(token);
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load sessions:', err);
    activeSessions = new Map();
  }
}

function saveSessions() {
  try {
    const dataDir = path.dirname(SESSIONS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const obj = Object.fromEntries(activeSessions);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    console.log(`[AUTH] Persistence: ${activeSessions.size} sessions saved to disk.`);
  } catch (err) {
    console.error('[AUTH] Persistence Error: Failed to save sessions:', err);
  }
}

loadSessions();

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const check = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return check === hash;
}

export function createToken(user: User): string {
  const token = `mq_${crypto.randomBytes(32).toString('hex')}`;
  // 7-day expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { user, expiresAt });
  saveSessions();
  return token;
}

export function getUserByToken(token: string): User | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    saveSessions();
    return null;
  }
  return session.user;
}

export function removeToken(token: string): void {
  activeSessions.delete(token);
  saveSessions();
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const user = getUserByToken(token);
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
