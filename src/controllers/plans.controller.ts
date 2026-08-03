import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

// ─── Helper: cast Express param (string | string[]) to string ────────────────
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

// A plan is visible to a user if it's an official/sample plan (PUBLIC) or
// they own it. Same rule used for list/get/start-day.
function visibleToUser(userId: string) {
  return {
    OR: [{ visibility: 'PUBLIC' as const }, { ownerId: userId }],
  };
}

// Exported so other layers (e.g. the AI chat service) that produce a plan
// shape for the client to prefill/save can reuse the same interfaces instead
// of redefining them.
export interface PlanSetInput {
  setNumber: number;
  targetReps: string;
  rpe?: number;
  isWarmup?: boolean;
}

export interface PlanExerciseInput {
  name: string;
  muscleGroup: string;
  notes?: string;
  sets: PlanSetInput[];
}

export interface PlanDayInput {
  dayNumber: number;
  label: string;
  sessionName: string;
  exercises: PlanExerciseInput[];
}

export interface PlanMetaInput {
  name?: string;
  description?: string;
  difficulty?: string;
  goal?: string;
  daysPerWeek?: number;
  estimatedMinutes?: number;
  tags?: string[];
}

function daysToCreatePayload(days: PlanDayInput[]) {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    label: day.label,
    sessionName: day.sessionName,
    exercises: {
      create: day.exercises.map((ex, exIndex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        notes: ex.notes ?? null,
        orderIndex: exIndex,
        sets: {
          create: ex.sets.map((s) => ({
            setNumber: s.setNumber,
            targetReps: s.targetReps,
            rpe: s.rpe ?? null,
            isWarmup: s.isWarmup ?? false,
          })),
        },
      })),
    },
  }));
}

const planDetailInclude = {
  days: {
    orderBy: { dayNumber: 'asc' as const },
    include: {
      exercises: {
        orderBy: { orderIndex: 'asc' as const },
        include: {
          sets: { orderBy: [{ isWarmup: 'desc' as const }, { setNumber: 'asc' as const }] },
        },
      },
    },
  },
};

// ─── Next workout — the next unstarted day in whichever plan the user most
// recently started a session from, so the dashboard can offer a one-click
// "continue plan" shortcut instead of making them go back to Plans and pick
// a day by hand every time. ─────────────────────────────────────────────────
export const getNextWorkout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const lastPlanSession = await prisma.workoutSession.findFirst({
      where: { userId, planId: { not: null } },
      orderBy: { startedAt: 'desc' },
    });

    if (!lastPlanSession || !lastPlanSession.planId) {
      res.json({ data: null });
      return;
    }

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: lastPlanSession.planId, ...visibleToUser(userId) },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          select: { dayNumber: true, label: true, sessionName: true },
        },
      },
    });

    // Plan may have since been deleted, or a user-owned plan no longer
    // visible — nothing sensible to suggest.
    if (!plan || plan.days.length === 0) {
      res.json({ data: null });
      return;
    }

    const currentIndex = plan.days.findIndex((d) => d.dayNumber === lastPlanSession.dayNumber);
    const nextDay = currentIndex === -1 ? plan.days[0] : plan.days[(currentIndex + 1) % plan.days.length];

    res.json({
      data: {
        planId: plan.id,
        planName: plan.name,
        dayNumber: nextDay.dayNumber,
        label: nextDay.label,
        sessionName: nextDay.sessionName,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── List plans visible to the user (summary — no days/exercises) ────────────
export const listPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const plans = await prisma.workoutPlan.findMany({
      where: visibleToUser(userId),
      select: {
        id: true,
        ownerId: true,
        name: true,
        description: true,
        difficulty: true,
        goal: true,
        daysPerWeek: true,
        estimatedMinutes: true,
        tags: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
};

// ─── Get a single plan (full detail including all days/exercises) ─────────────
export const getPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: planId, ...visibleToUser(userId) },
      include: planDetailInclude,
    });
    if (!plan) throw new AppError(404, `Plan not found: ${planId}`);

    res.json({ data: plan });
  } catch (err) {
    next(err);
  }
};

// ─── Create a plan (always private, owned by the current user) ──────────────
export const createPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, description, difficulty, goal, daysPerWeek, estimatedMinutes, tags, days } =
      req.body as PlanMetaInput & { days?: PlanDayInput[] };

    const plan = await prisma.workoutPlan.create({
      data: {
        ownerId: userId,
        visibility: 'PRIVATE',
        name: name!,
        description,
        difficulty,
        goal,
        daysPerWeek,
        estimatedMinutes,
        tags: tags ?? [],
        days: { create: daysToCreatePayload(days ?? []) },
      },
      include: planDetailInclude,
    });

    res.status(201).json({ data: plan });
  } catch (err) {
    next(err);
  }
};

// ─── Update a plan (owner only) ───────────────────────────────────────────────
export const updatePlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);

    const existing = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!existing || existing.ownerId !== userId) {
      throw new AppError(404, `Plan not found: ${planId}`);
    }

    const { name, description, difficulty, goal, daysPerWeek, estimatedMinutes, tags, days } =
      req.body as PlanMetaInput & { days?: PlanDayInput[] };

    const updated = await prisma.$transaction(async (tx) => {
      await tx.workoutPlan.update({
        where: { id: planId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(difficulty !== undefined && { difficulty }),
          ...(goal !== undefined && { goal }),
          ...(daysPerWeek !== undefined && { daysPerWeek }),
          ...(estimatedMinutes !== undefined && { estimatedMinutes }),
          ...(tags !== undefined && { tags }),
        },
      });

      // Replacing the whole nested tree is the simplest correct semantics
      // for a "save the whole plan" editor — no granular day/exercise diffing.
      if (days !== undefined) {
        await tx.planDay.deleteMany({ where: { planId } });
        for (const dayPayload of daysToCreatePayload(days)) {
          await tx.planDay.create({ data: { planId, ...dayPayload } });
        }
      }

      return tx.workoutPlan.findUnique({ where: { id: planId }, include: planDetailInclude });
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// ─── Delete a plan (owner only) ───────────────────────────────────────────────
export const deletePlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);

    const existing = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!existing || existing.ownerId !== userId) {
      throw new AppError(404, `Plan not found: ${planId}`);
    }

    await prisma.workoutPlan.delete({ where: { id: planId } });
    res.json({ message: 'Workout plan deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Start a plan day — creates a WorkoutSession pre-filled with exercises ───
export const startPlanDay = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    const { dayNumber } = req.body as { dayNumber: number };

    const plan = await prisma.workoutPlan.findFirst({ where: { id: planId, ...visibleToUser(userId) } });
    if (!plan) throw new AppError(404, `Plan not found: ${planId}`);

    const planDay = await prisma.planDay.findFirst({
      where: { planId, dayNumber },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' },
          include: { sets: { orderBy: [{ isWarmup: 'desc' }, { setNumber: 'asc' }] } },
        },
      },
    });
    if (!planDay) throw new AppError(404, `Day ${dayNumber} not found in plan ${planId}`);

    // Create the workout session + exercise logs in a single transaction
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        name: planDay.sessionName,
        notes: `From plan: ${plan.name} — ${planDay.label}`,
        planId: plan.id,
        dayNumber: planDay.dayNumber,
        exerciseLogs: {
          create: planDay.exercises.map((ex, exIndex) => ({
            exerciseName: ex.name,
            muscleGroup: ex.muscleGroup,
            orderIndex: exIndex,
            notes: ex.notes ?? null,
            // Pre-create placeholder sets with just setNumber + isWarmup.
            // weightKg and reps stay null — user fills them in.
            sets: {
              create: ex.sets.map((s) => ({
                setNumber: s.setNumber,
                isWarmup: s.isWarmup,
              })),
            },
          })),
        },
      },
      include: {
        exerciseLogs: {
          include: { sets: { orderBy: [{ isWarmup: 'desc' }, { setNumber: 'asc' }] } },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Attach the targetReps info from the plan into the response (not stored
    // on ExerciseSet) so the frontend can show "aim for 8-12 reps" guidance.
    const sessionWithTargets = {
      ...session,
      exerciseLogs: session.exerciseLogs.map((log, exIndex) => {
        const planEx = planDay.exercises[exIndex];
        return {
          ...log,
          sets: log.sets.map((set, setIndex) => ({
            ...set,
            targetReps: planEx?.sets[setIndex]?.targetReps ?? null,
          })),
        };
      }),
    };

    res.status(201).json({ data: sessionWithTargets });
  } catch (err) {
    next(err);
  }
};
