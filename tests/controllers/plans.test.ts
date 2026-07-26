import request from 'supertest';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import app from '../../src/app';
import { authHeader, USER_A_ID, USER_B_ID } from '../utils/testHelpers';

const ownedPlan = {
  id: 'plan-owned',
  ownerId: USER_A_ID,
  visibility: 'PRIVATE',
  name: "My Custom Split",
  description: 'desc',
  difficulty: 'Intermediate',
  goal: 'Strength',
  daysPerWeek: 4,
  estimatedMinutes: 60,
  tags: ['Barbell'],
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

const publicPlan = { ...ownedPlan, id: 'plan-public', ownerId: null, visibility: 'PUBLIC', name: 'Starting Strength' };

const validDayPayload = [
  {
    dayNumber: 1,
    label: 'Day 1',
    sessionName: 'Push Day',
    exercises: [
      {
        name: 'Bench Press',
        muscleGroup: 'Chest',
        sets: [{ setNumber: 1, targetReps: '8-12' }],
      },
    ],
  },
];

describe('GET /api/plans', () => {
  it('positive: lists plans visible to the user (public + their own)', async () => {
    (prisma.workoutPlan.findMany as jest.Mock).mockResolvedValue([publicPlan, ownedPlan]);

    const res = await request(app).get('/api/plans').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(prisma.workoutPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ visibility: 'PUBLIC' }, { ownerId: USER_A_ID }] },
      })
    );
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(401);
  });

  it('negative: returns an empty list for a user with no plans and no public plans seeded', async () => {
    (prisma.workoutPlan.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/plans').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('negative: a database failure surfaces as a generic 500', async () => {
    (prisma.workoutPlan.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/plans').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/plans/:planId', () => {
  it('positive: returns full plan detail for a visible plan', async () => {
    (prisma.workoutPlan.findFirst as jest.Mock).mockResolvedValue({ ...ownedPlan, days: [] });

    const res = await request(app)
      .get(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ownedPlan.id);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get(`/api/plans/${ownedPlan.id}`);
    expect(res.status).toBe(401);
  });

  it('SECURITY (IDOR): a private plan owned by another user is indistinguishable from "not found"', async () => {
    // The query itself is scoped to visibleToUser, so a private plan owned by
    // someone else simply never matches — findFirst legitimately returns null.
    (prisma.workoutPlan.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.workoutPlan.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ownedPlan.id, OR: [{ visibility: 'PUBLIC' }, { ownerId: USER_B_ID }] },
      })
    );
  });

  it('negative: rejects a blank planId', async () => {
    const res = await request(app)
      .get('/api/plans/%20')
      .set('Authorization', authHeader(USER_A_ID));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/plans', () => {
  it('positive: creates a private plan owned by the caller', async () => {
    (prisma.workoutPlan.create as jest.Mock).mockResolvedValue({ ...ownedPlan, days: [] });

    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'My Custom Split', days: validDayPayload });

    expect(res.status).toBe(201);
    expect(prisma.workoutPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: USER_A_ID, visibility: 'PRIVATE' }) })
    );
  });

  it('negative: rejects a missing plan name', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ days: validDayPayload });
    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post('/api/plans').send({ name: 'x', days: validDayPayload });
    expect(res.status).toBe(401);
  });

  it('negative: rejects a day with no exercises array', async () => {
    const res = await request(app)
      .post('/api/plans')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Bad Plan', days: [{ dayNumber: 1, label: 'Day 1', sessionName: 'Day 1' }] });

    expect(res.status).toBe(400);
    expect(prisma.workoutPlan.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/plans/:planId', () => {
  it('positive: the owner can update their plan', async () => {
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(ownedPlan);
    (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(prisma));
    (prisma.workoutPlan.update as jest.Mock).mockResolvedValue(undefined);
    (prisma.workoutPlan.findUnique as jest.Mock)
      .mockResolvedValueOnce(ownedPlan) // ownership check
      .mockResolvedValueOnce({ ...ownedPlan, name: 'Updated Name', days: [] }); // final re-fetch inside tx

    const res = await request(app)
      .patch(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).patch(`/api/plans/${ownedPlan.id}`).send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('SECURITY (IDOR): user B cannot update user A\'s owned plan', async () => {
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(ownedPlan);

    const res = await request(app)
      .patch(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('negative: cannot even edit a PUBLIC sample plan you don\'t own', async () => {
    // publicPlan.ownerId is null — never equal to any userId, so no one but
    // a real owner can edit it (samples are edited only via re-seeding).
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(publicPlan);

    const res = await request(app)
      .patch(`/api/plans/${publicPlan.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Hijacked Sample' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/plans/:planId', () => {
  it('positive: the owner can delete their plan', async () => {
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(ownedPlan);
    (prisma.workoutPlan.delete as jest.Mock).mockResolvedValue(ownedPlan);

    const res = await request(app)
      .delete(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(`/api/plans/${ownedPlan.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a non-existent plan', async () => {
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/plans/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot delete user A\'s plan', async () => {
    (prisma.workoutPlan.findUnique as jest.Mock).mockResolvedValue(ownedPlan);

    const res = await request(app)
      .delete(`/api/plans/${ownedPlan.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.workoutPlan.delete).not.toHaveBeenCalled();
  });
});

describe('POST /api/plans/:planId/start-day', () => {
  const planDay = {
    id: 'day-1',
    planId: ownedPlan.id,
    dayNumber: 1,
    label: 'Day 1',
    sessionName: 'Push Day',
    exercises: [{ name: 'Bench Press', muscleGroup: 'Chest', notes: null, sets: [{ setNumber: 1, targetReps: '8-12', isWarmup: false }] }],
  };

  it('positive: starting a valid day creates a pre-filled workout session', async () => {
    (prisma.workoutPlan.findFirst as jest.Mock).mockResolvedValue(ownedPlan);
    (prisma.planDay.findFirst as jest.Mock).mockResolvedValue(planDay);
    (prisma.workoutSession.create as jest.Mock).mockResolvedValue({
      id: 'new-session',
      name: 'Push Day',
      exerciseLogs: [{ id: 'log-1', sets: [{ id: 'set-1', setNumber: 1 }] }],
    });

    const res = await request(app)
      .post(`/api/plans/${ownedPlan.id}/start-day`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ dayNumber: 1 });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Push Day');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post(`/api/plans/${ownedPlan.id}/start-day`).send({ dayNumber: 1 });
    expect(res.status).toBe(401);
  });

  it('negative: rejects a non-positive dayNumber', async () => {
    const res = await request(app)
      .post(`/api/plans/${ownedPlan.id}/start-day`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ dayNumber: 0 });

    expect(res.status).toBe(400);
  });

  it('negative: 404 when the requested day does not exist on the plan', async () => {
    (prisma.workoutPlan.findFirst as jest.Mock).mockResolvedValue(ownedPlan);
    (prisma.planDay.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post(`/api/plans/${ownedPlan.id}/start-day`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ dayNumber: 99 });

    expect(res.status).toBe(404);
    expect(prisma.workoutSession.create).not.toHaveBeenCalled();
  });
});
