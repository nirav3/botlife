import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';

/**
 * Full exercise catalog — small (~100 rows) and effectively static, so the
 * client fetches it once and caches it client-side (long staleTime) rather
 * than looking up one exercise per request. See exerciseCatalog.service.ts
 * for the equivalent in-memory cache used server-side.
 */
export const getCatalog = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const catalog = await prisma.exerciseCatalog.findMany({ orderBy: { name: 'asc' } });
    res.json({ data: catalog });
  } catch (err) {
    next(err);
  }
};
