import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../services/firestore.js';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: 'admin' | 'rider' | 'customer';
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      res.status(401).json({ error: 'Missing ID token' });
      return;
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: decoded.admin ? 'admin' : 'customer'
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
