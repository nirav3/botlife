import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';

interface JwtPayload {
  id: string;
  email: string;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // A missing secret is a deployment misconfiguration, not a bad token —
    // reporting it as 401 would make every user look unauthenticated while
    // hiding the actual ops problem from anyone watching logs/alerts.
    next(new Error('JWT_SECRET not configured'));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
