import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

async function assertPlanOwner(planId: string, userId: string) {
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.userId !== userId) {
    throw new AppError(404, 'Meal plan not found');
  }
  return plan;
}

export const createMealPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, targetCalories, targetProteinG, targetCarbsG, targetFatG } = req.body as {
      name: string;
      targetCalories?: number;
      targetProteinG?: number;
      targetCarbsG?: number;
      targetFatG?: number;
    };

    const plan = await prisma.mealPlan.create({
      data: { userId, name, targetCalories, targetProteinG, targetCarbsG, targetFatG },
      include: { meals: { include: { foodItems: true } } },
    });

    res.status(201).json({ data: plan });
  } catch (err) {
    next(err);
  }
};

export const getMealPlans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const plans = await prisma.mealPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { meals: { include: { foodItems: true } } },
    });
    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
};

export const getMealPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: { meals: { include: { foodItems: true } } },
    });
    if (!plan || plan.userId !== userId) throw new AppError(404, 'Meal plan not found');
    res.json({ data: plan });
  } catch (err) {
    next(err);
  }
};

export const updateMealPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    await assertPlanOwner(planId, userId);

    const { name, targetCalories, targetProteinG, targetCarbsG, targetFatG, isActive } =
      req.body as {
        name?: string;
        targetCalories?: number;
        targetProteinG?: number;
        targetCarbsG?: number;
        targetFatG?: number;
        isActive?: boolean;
      };

    const updated = await prisma.mealPlan.update({
      where: { id: planId },
      data: {
        ...(name !== undefined && { name }),
        ...(targetCalories !== undefined && { targetCalories }),
        ...(targetProteinG !== undefined && { targetProteinG }),
        ...(targetCarbsG !== undefined && { targetCarbsG }),
        ...(targetFatG !== undefined && { targetFatG }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { meals: { include: { foodItems: true } } },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteMealPlan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    await assertPlanOwner(planId, userId);
    await prisma.mealPlan.delete({ where: { id: planId } });
    res.json({ message: 'Meal plan deleted' });
  } catch (err) {
    next(err);
  }
};

export const addMeal = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    await assertPlanOwner(planId, userId);

    const { name, loggedAt } = req.body as { name: string; loggedAt?: string };

    const meal = await prisma.meal.create({
      data: {
        mealPlanId: planId,
        name,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
      include: { foodItems: true },
    });

    res.status(201).json({ data: meal });
  } catch (err) {
    next(err);
  }
};

export const addFoodItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    const mealId = param(req.params.mealId);
    await assertPlanOwner(planId, userId);

    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal || meal.mealPlanId !== planId) throw new AppError(404, 'Meal not found');

    const { name, quantity, unit, calories, proteinG, carbsG, fatG } = req.body as {
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
    };

    const food = await prisma.foodItem.create({
      data: {
        mealId,
        name,
        quantity,
        unit,
        calories,
        proteinG: proteinG ?? 0,
        carbsG: carbsG ?? 0,
        fatG: fatG ?? 0,
      },
    });

    res.status(201).json({ data: food });
  } catch (err) {
    next(err);
  }
};

export const deleteFoodItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const planId = param(req.params.planId);
    const foodId = param(req.params.foodId);
    await assertPlanOwner(planId, userId);

    await prisma.foodItem.delete({ where: { id: foodId } });
    res.json({ message: 'Food item deleted' });
  } catch (err) {
    next(err);
  }
};

export const getDailySummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get active plan's targets
    const activePlan = await prisma.mealPlan.findFirst({
      where: { userId, isActive: true },
    });

    // Get all meals logged today across any plan
    const meals = await prisma.meal.findMany({
      where: {
        mealPlan: { userId },
        loggedAt: { gte: date, lt: nextDay },
      },
      include: { foodItems: true },
    });

    const totals = meals.reduce(
      (acc, meal) => {
        meal.foodItems.forEach((item) => {
          acc.calories += item.calories;
          acc.proteinG += item.proteinG;
          acc.carbsG += item.carbsG;
          acc.fatG += item.fatG;
        });
        return acc;
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    res.json({
      data: {
        date: dateStr,
        meals,
        totals: {
          calories: parseFloat(totals.calories.toFixed(1)),
          proteinG: parseFloat(totals.proteinG.toFixed(1)),
          carbsG: parseFloat(totals.carbsG.toFixed(1)),
          fatG: parseFloat(totals.fatG.toFixed(1)),
        },
        targets: activePlan
          ? {
              calories: activePlan.targetCalories,
              proteinG: activePlan.targetProteinG,
              carbsG: activePlan.targetCarbsG,
              fatG: activePlan.targetFatG,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
};
