import request from 'supertest';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import app from '../../src/app';
import { authHeader, USER_A_ID, USER_B_ID } from '../utils/testHelpers';

const planA = {
  id: 'plan-a',
  userId: USER_A_ID,
  name: 'Cutting Plan',
  targetCalories: 2200,
  targetProteinG: 180,
  targetCarbsG: 220,
  targetFatG: 70,
  isActive: true,
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

const mealInPlanA = {
  id: 'meal-a',
  mealPlanId: planA.id,
  name: 'Breakfast',
  loggedAt: new Date('2024-06-01'),
  createdAt: new Date('2024-06-01'),
};

const foodInMealA = {
  id: 'food-a',
  mealId: mealInPlanA.id,
  name: 'Oats',
  quantity: 100,
  unit: 'g',
  calories: 389,
  proteinG: 17,
  carbsG: 66,
  fatG: 7,
};

describe('POST /api/meals', () => {
  it('positive: creates a meal plan for the authenticated user', async () => {
    (prisma.mealPlan.create as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .post('/api/meals')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Cutting Plan', targetCalories: 2200 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Cutting Plan');
  });

  it('negative: rejects a missing plan name', async () => {
    const res = await request(app)
      .post('/api/meals')
      .set('Authorization', authHeader(USER_A_ID))
      .send({});
    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post('/api/meals').send({ name: 'Plan' });
    expect(res.status).toBe(401);
  });

  it('negative: rejects a negative target calories value', async () => {
    const res = await request(app)
      .post('/api/meals')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Plan', targetCalories: -100 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/meals/:planId', () => {
  it('positive: returns the plan with its meals', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue({ ...planA, meals: [] });

    const res = await request(app)
      .get(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(planA.id);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get(`/api/meals/${planA.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a non-existent plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/meals/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot view user A\'s meal plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue({ ...planA, meals: [] });

    const res = await request(app)
      .get(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/meals/:planId', () => {
  it('positive: the owner can update their plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.mealPlan.update as jest.Mock).mockResolvedValue({ ...planA, name: 'Bulking Plan' });

    const res = await request(app)
      .patch(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Bulking Plan' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Bulking Plan');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).patch(`/api/meals/${planA.id}`).send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('negative: rejects a non-boolean isActive', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .patch(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ isActive: 'yes' });

    expect(res.status).toBe(400);
  });

  it('SECURITY (IDOR): user B cannot update user A\'s meal plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .patch(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(prisma.mealPlan.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/meals/:planId', () => {
  it('positive: the owner can delete their plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.mealPlan.delete as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .delete(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(`/api/meals/${planA.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a non-existent plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/meals/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot delete user A\'s meal plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .delete(`/api/meals/${planA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.mealPlan.delete).not.toHaveBeenCalled();
  });
});

describe('POST /api/meals/:planId/meals', () => {
  it('positive: adds a meal to the plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.meal.create as jest.Mock).mockResolvedValue(mealInPlanA);

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Breakfast' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Breakfast');
  });

  it('negative: rejects a missing meal name', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({});

    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post(`/api/meals/${planA.id}/meals`).send({ name: 'Breakfast' });
    expect(res.status).toBe(401);
  });

  it('SECURITY (IDOR): user B cannot add a meal to user A\'s plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ name: 'Hijack Meal' });

    expect(res.status).toBe(404);
    expect(prisma.meal.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/meals/:planId/meals/:mealId/foods', () => {
  it('positive: adds a food item to the meal', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.meal.findUnique as jest.Mock).mockResolvedValue(mealInPlanA);
    (prisma.foodItem.create as jest.Mock).mockResolvedValue(foodInMealA);

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Oats', quantity: 100, unit: 'g', calories: 389 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Oats');
  });

  it('negative: rejects a missing calories value', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Oats', quantity: 100, unit: 'g' });

    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods`)
      .send({ name: 'Oats', quantity: 100, unit: 'g', calories: 389 });
    expect(res.status).toBe(401);
  });

  it('negative: 404 when the meal does not belong to the given plan', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.meal.findUnique as jest.Mock).mockResolvedValue({ ...mealInPlanA, mealPlanId: 'some-other-plan' });

    const res = await request(app)
      .post(`/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Oats', quantity: 100, unit: 'g', calories: 389 });

    expect(res.status).toBe(404);
    expect(prisma.foodItem.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/meals/:planId/meals/:mealId/foods/:foodId', () => {
  it('positive: the owner can delete their own food item', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planA);
    (prisma.meal.findUnique as jest.Mock).mockResolvedValue(mealInPlanA);
    (prisma.foodItem.findUnique as jest.Mock).mockResolvedValue(foodInMealA);
    (prisma.foodItem.delete as jest.Mock).mockResolvedValue(foodInMealA);

    const res = await request(app)
      .delete(`/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods/${foodInMealA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(
      `/api/meals/${planA.id}/meals/${mealInPlanA.id}/foods/${foodInMealA.id}`
    );
    expect(res.status).toBe(401);
  });

  it('negative: 404 when the plan does not belong to the caller', async () => {
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/meals/does-not-exist/meals/${mealInPlanA.id}/foods/${foodInMealA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
    expect(prisma.foodItem.delete).not.toHaveBeenCalled();
  });

  it('SECURITY (IDOR): user B cannot delete a food item belonging to user A\'s plan by supplying their own valid planId', async () => {
    const planB = { ...planA, id: 'plan-b', userId: USER_B_ID };
    // User B's own plan passes ownership...
    (prisma.mealPlan.findUnique as jest.Mock).mockResolvedValue(planB);
    // ...but foodId/mealId in the URL actually belong to user A's plan
    (prisma.meal.findUnique as jest.Mock).mockResolvedValue(mealInPlanA);
    (prisma.foodItem.findUnique as jest.Mock).mockResolvedValue(foodInMealA);

    const res = await request(app)
      .delete(`/api/meals/${planB.id}/meals/${mealInPlanA.id}/foods/${foodInMealA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.foodItem.delete).not.toHaveBeenCalled();
  });
});

describe('GET /api/meals/daily-summary', () => {
  it('positive: aggregates today\'s totals from logged meals', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(planA);
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([{ ...mealInPlanA, foodItems: [foodInMealA] }]);

    const res = await request(app)
      .get('/api/meals/daily-summary')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.totals.calories).toBe(389);
    expect(res.body.data.targets.calories).toBe(planA.targetCalories);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/meals/daily-summary');
    expect(res.status).toBe(401);
  });

  it('negative: returns null targets (not an error) when the user has no active plan', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/meals/daily-summary')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.targets).toBeNull();
    expect(res.body.data.totals.calories).toBe(0);
  });

  it('negative: only aggregates the calling user\'s meals, never another user\'s', async () => {
    (prisma.mealPlan.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.meal.findMany as jest.Mock).mockResolvedValue([]);

    await request(app).get('/api/meals/daily-summary').set('Authorization', authHeader(USER_A_ID));

    expect(prisma.meal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ mealPlan: { userId: USER_A_ID } }) })
    );
  });
});
