import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const logWeight = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { weightKg, note, loggedAt } = req.body as {
      weightKg: number;
      note?: string;
      loggedAt?: string;
    };

    const entry = await prisma.weightEntry.create({
      data: {
        userId,
        weightKg,
        note,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    res.status(201).json({ data: entry });
  } catch (err) {
    next(err);
  }
};

export const getWeightHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '30');
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where = {
      userId,
      ...(from || to
        ? {
            loggedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.weightEntry.findMany({
        where,
        orderBy: { loggedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.weightEntry.count({ where }),
    ]);

    res.json({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getWeightStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const entries = await prisma.weightEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: 'asc' },
      select: { weightKg: true, loggedAt: true },
    });

    if (entries.length === 0) {
      res.json({ data: null, message: 'No weight entries found' });
      return;
    }

    const weights = entries.map((e) => e.weightKg);
    const current = weights[weights.length - 1];
    const starting = weights[0];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const totalChange = current - starting;

    // 7-day trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentEntries = entries.filter((e) => e.loggedAt >= sevenDaysAgo);
    const weeklyTrend =
      recentEntries.length >= 2
        ? recentEntries[recentEntries.length - 1].weightKg - recentEntries[0].weightKg
        : null;

    res.json({
      data: {
        current,
        starting,
        min,
        max,
        avg: parseFloat(avg.toFixed(2)),
        totalChange: parseFloat(totalChange.toFixed(2)),
        weeklyTrend: weeklyTrend !== null ? parseFloat(weeklyTrend.toFixed(2)) : null,
        totalEntries: entries.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const deleteWeightEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = param(req.params.id);

    const entry = await prisma.weightEntry.findUnique({ where: { id } });
    if (!entry || entry.userId !== userId) {
      throw new AppError(404, 'Weight entry not found');
    }

    await prisma.weightEntry.delete({ where: { id } });
    res.json({ message: 'Weight entry deleted' });
  } catch (err) {
    next(err);
  }
};
