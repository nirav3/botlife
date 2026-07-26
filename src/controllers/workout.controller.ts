import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';
import { getExerciseSubstitutes } from '../services/planExercise.service';

// ─── Helper: cast Express param (string | string[]) to string ────────────────
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// ─── Helper: verify session belongs to user ───────────────────────────────────
async function assertSessionOwner(sessionId: string, userId: string) {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) {
    throw new AppError(404, 'Workout session not found');
  }
  return session;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const createSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, notes, startedAt } = req.body as {
      name: string;
      notes?: string;
      startedAt?: string;
    };

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        name,
        notes,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
      include: { exerciseLogs: { include: { sets: true } } },
    });

    res.status(201).json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const getSessions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');

    const [sessions, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          exerciseLogs: {
            include: { sets: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      }),
      prisma.workoutSession.count({ where: { userId } }),
    ]);

    res.json({
      data: sessions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

export const getSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);

    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        exerciseLogs: {
          include: { sets: { orderBy: { setNumber: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!session || session.userId !== userId) {
      throw new AppError(404, 'Workout session not found');
    }

    res.json({ data: session });
  } catch (err) {
    next(err);
  }
};

export const updateSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    await assertSessionOwner(sessionId, userId);

    const { name, notes, endedAt } = req.body as {
      name?: string;
      notes?: string;
      endedAt?: string;
    };

    const updated = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        ...(name !== undefined && { name }),
        ...(notes !== undefined && { notes }),
        ...(endedAt !== undefined && { endedAt: new Date(endedAt) }),
      },
      include: { exerciseLogs: { include: { sets: true } } },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    await assertSessionOwner(sessionId, userId);

    await prisma.workoutSession.delete({ where: { id: sessionId } });
    res.json({ message: 'Workout session deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Exercise Logs ────────────────────────────────────────────────────────────

export const addExerciseLog = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    await assertSessionOwner(sessionId, userId);

    const { exerciseName, muscleGroup, orderIndex, notes } = req.body as {
      exerciseName: string;
      muscleGroup?: string;
      orderIndex?: number;
      notes?: string;
    };

    const log = await prisma.exerciseLog.create({
      data: {
        workoutSessionId: sessionId,
        exerciseName,
        muscleGroup,
        orderIndex: orderIndex ?? 0,
        notes,
      },
      include: { sets: true },
    });

    res.status(201).json({ data: log });
  } catch (err) {
    next(err);
  }
};

// ─── Swap exercise (random alternative, same muscle group) ───────────────────
export const swapExercise = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    const exerciseLogId = param(req.params.exerciseLogId);
    await assertSessionOwner(sessionId, userId);

    const log = await prisma.exerciseLog.findUnique({
      where: { id: exerciseLogId },
      include: { sets: true },
    });
    if (!log || log.workoutSessionId !== sessionId) {
      throw new AppError(404, 'Exercise log not found');
    }

    const alreadyStarted = log.sets.some(
      (s) => s.weightKg != null || s.reps != null || s.durationSecs != null
    );
    if (alreadyStarted) {
      throw new AppError(400, "Can't swap after you've started logging this exercise");
    }

    const pool = await getExerciseSubstitutes(log.muscleGroup, log.exerciseName, userId);
    if (pool.length === 0) {
      throw new AppError(404, 'No alternative exercises found for this muscle group');
    }

    const newName = pool[Math.floor(Math.random() * pool.length)];

    const updated = await prisma.exerciseLog.update({
      where: { id: exerciseLogId },
      data: { exerciseName: newName },
      include: { sets: { orderBy: { setNumber: 'asc' } } },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── Sets ──────────────────────────────────────────────────────────────────────

export const addSet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    const exerciseLogId = param(req.params.exerciseLogId);
    await assertSessionOwner(sessionId, userId);

    const log = await prisma.exerciseLog.findUnique({ where: { id: exerciseLogId } });
    if (!log || log.workoutSessionId !== sessionId) {
      throw new AppError(404, 'Exercise log not found');
    }

    const { setNumber, weightKg, reps, durationSecs, rpe, isWarmup } = req.body as {
      setNumber: number;
      weightKg?: number;
      reps?: number;
      durationSecs?: number;
      rpe?: number;
      isWarmup?: boolean;
    };

    const set = await prisma.exerciseSet.create({
      data: {
        exerciseLogId,
        setNumber,
        weightKg,
        reps,
        durationSecs,
        rpe,
        isWarmup: isWarmup ?? false,
      },
    });

    res.status(201).json({ data: set });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: verify a set belongs to the given exercise log, which in turn
// belongs to the given (already ownership-checked) session — without this,
// a caller could pass their OWN sessionId/exerciseLogId alongside someone
// else's setId and the set-level Prisma call would happily update/delete it.
async function assertSetInSession(sessionId: string, exerciseLogId: string, setId: string) {
  const log = await prisma.exerciseLog.findUnique({ where: { id: exerciseLogId } });
  if (!log || log.workoutSessionId !== sessionId) {
    throw new AppError(404, 'Exercise log not found');
  }
  const set = await prisma.exerciseSet.findUnique({ where: { id: setId } });
  if (!set || set.exerciseLogId !== exerciseLogId) {
    throw new AppError(404, 'Set not found');
  }
  return set;
}

export const updateSet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    const exerciseLogId = param(req.params.exerciseLogId);
    const setId = param(req.params.setId);
    await assertSessionOwner(sessionId, userId);
    await assertSetInSession(sessionId, exerciseLogId, setId);

    const { weightKg, reps, durationSecs, rpe } = req.body as {
      weightKg?: number;
      reps?: number;
      durationSecs?: number;
      rpe?: number;
    };

    const updated = await prisma.exerciseSet.update({
      where: { id: setId },
      data: {
        ...(weightKg !== undefined && { weightKg }),
        ...(reps !== undefined && { reps }),
        ...(durationSecs !== undefined && { durationSecs }),
        ...(rpe !== undefined && { rpe }),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = param(req.params.sessionId);
    const exerciseLogId = param(req.params.exerciseLogId);
    const setId = param(req.params.setId);
    await assertSessionOwner(sessionId, userId);
    await assertSetInSession(sessionId, exerciseLogId, setId);

    await prisma.exerciseSet.delete({ where: { id: setId } });
    res.json({ message: 'Set deleted' });
  } catch (err) {
    next(err);
  }
};
