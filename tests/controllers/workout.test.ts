import request from 'supertest';

jest.mock('../../src/lib/prisma');
jest.mock('../../src/services/planExercise.service');
import { prisma } from '../../src/lib/prisma';
import { getExerciseSubstitutes } from '../../src/services/planExercise.service';
import app from '../../src/app';
import { authHeader, USER_A_ID, USER_B_ID } from '../utils/testHelpers';

const sessionA = {
  id: 'session-a',
  userId: USER_A_ID,
  name: 'Push Day',
  notes: null,
  startedAt: new Date('2024-06-01'),
  endedAt: null,
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

const logInSessionA = {
  id: 'log-a',
  workoutSessionId: sessionA.id,
  exerciseName: 'Bench Press',
  muscleGroup: 'Chest',
  orderIndex: 0,
  notes: null,
  createdAt: new Date('2024-06-01'),
  sets: [] as { weightKg: number | null; reps: number | null; durationSecs: number | null }[],
};

const setInLogA = {
  id: 'set-a',
  exerciseLogId: logInSessionA.id,
  setNumber: 1,
  weightKg: 60,
  reps: 8,
  durationSecs: null,
  rpe: 7,
  isWarmup: false,
  completedAt: new Date('2024-06-01'),
};

describe('POST /api/workouts', () => {
  it('positive: creates a session for the authenticated user', async () => {
    (prisma.workoutSession.create as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .post('/api/workouts')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Push Day' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Push Day');
  });

  it('negative: rejects a missing/blank session name', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post('/api/workouts').send({ name: 'Push Day' });
    expect(res.status).toBe(401);
  });

  it('negative: rejects a malformed startedAt date', async () => {
    const res = await request(app)
      .post('/api/workouts')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Push Day', startedAt: 'not-a-date' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/workouts', () => {
  it('positive: lists sessions scoped to the authenticated user', async () => {
    (prisma.workoutSession.findMany as jest.Mock).mockResolvedValue([sessionA]);
    (prisma.workoutSession.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/api/workouts').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(prisma.workoutSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_A_ID } })
    );
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/workouts');
    expect(res.status).toBe(401);
  });

  it('negative: returns an empty list rather than erroring for a brand-new user', async () => {
    (prisma.workoutSession.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.workoutSession.count as jest.Mock).mockResolvedValue(0);

    const res = await request(app).get('/api/workouts').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('negative: a database failure surfaces as a generic 500', async () => {
    (prisma.workoutSession.findMany as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/workouts').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/workouts/:sessionId', () => {
  it('positive: returns the session with exercise logs', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue({ ...sessionA, exerciseLogs: [] });

    const res = await request(app)
      .get(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(sessionA.id);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get(`/api/workouts/${sessionA.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a session id that does not exist', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/workouts/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot view user A\'s session by id', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue({ ...sessionA, exerciseLogs: [] });

    const res = await request(app)
      .get(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/workouts/:sessionId', () => {
  it('positive: the owner can update their session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.workoutSession.update as jest.Mock).mockResolvedValue({ ...sessionA, name: 'Push Day v2' });

    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ name: 'Push Day v2' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Push Day v2');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).patch(`/api/workouts/${sessionA.id}`).send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('SECURITY (IDOR): user B cannot update user A\'s session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(prisma.workoutSession.update).not.toHaveBeenCalled();
  });

  it('negative: rejects a malformed endedAt date', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ endedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/workouts/:sessionId', () => {
  it('positive: the owner can delete their session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.workoutSession.delete as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .delete(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(`/api/workouts/${sessionA.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a non-existent session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/workouts/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot delete user A\'s session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .delete(`/api/workouts/${sessionA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.workoutSession.delete).not.toHaveBeenCalled();
  });
});

describe('POST /api/workouts/:sessionId/exercises', () => {
  it('positive: adds an exercise log to the session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.create as jest.Mock).mockResolvedValue(logInSessionA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ exerciseName: 'Bench Press', muscleGroup: 'Chest' });

    expect(res.status).toBe(201);
    expect(res.body.data.exerciseName).toBe('Bench Press');
  });

  it('negative: rejects a missing exercise name', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({});

    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises`)
      .send({ exerciseName: 'Bench Press' });
    expect(res.status).toBe(401);
  });

  it('SECURITY (IDOR): user B cannot add an exercise to user A\'s session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ exerciseName: 'Hijack Row' });

    expect(res.status).toBe(404);
    expect(prisma.exerciseLog.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/workouts/:sessionId/exercises/:exerciseLogId/swap', () => {
  it('positive: swaps an unstarted exercise for a random alternative', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);
    (getExerciseSubstitutes as jest.Mock).mockResolvedValue(['Goblet Squat']);
    (prisma.exerciseLog.update as jest.Mock).mockResolvedValue({ ...logInSessionA, exerciseName: 'Goblet Squat' });

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/swap`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.exerciseName).toBe('Goblet Squat');
  });

  it("positive: clears the old exercise's notes on swap — they were written for the exercise being replaced (e.g. a bodyweight-specific hint) and are actively misleading on the substitute", async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue({
      ...logInSessionA,
      exerciseName: 'Pull-ups',
      notes: 'Add weight once bodyweight feels easy',
    });
    (getExerciseSubstitutes as jest.Mock).mockResolvedValue(['Barbell Row']);
    (prisma.exerciseLog.update as jest.Mock).mockResolvedValue({
      ...logInSessionA,
      exerciseName: 'Barbell Row',
      notes: null,
    });

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/swap`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBeNull();
    expect(prisma.exerciseLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { exerciseName: 'Barbell Row', notes: null } })
    );
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/swap`);
    expect(res.status).toBe(401);
  });

  it('negative: refuses to swap an exercise that already has logged sets', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue({
      ...logInSessionA,
      sets: [{ weightKg: 60, reps: 8, durationSecs: null }],
    });

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/swap`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/started logging/i);
    expect(prisma.exerciseLog.update).not.toHaveBeenCalled();
  });

  it('negative: 404 when no substitute exercises exist for the muscle group', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);
    (getExerciseSubstitutes as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/swap`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });
});

describe('POST /api/workouts/:sessionId/exercises/:exerciseLogId/sets', () => {
  it('positive: logs a set on an exercise', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);
    (prisma.exerciseSet.create as jest.Mock).mockResolvedValue(setInLogA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ setNumber: 1, weightKg: 60, reps: 8 });

    expect(res.status).toBe(201);
    expect(res.body.data.weightKg).toBe(60);
  });

  it('negative: rejects setNumber less than 1', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ setNumber: 0 });

    expect(res.status).toBe(400);
  });

  it('negative: rejects an RPE outside the 1-10 range', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ setNumber: 1, rpe: 15 });

    expect(res.status).toBe(400);
  });

  it('negative: 404 when the exercise log does not belong to the given session', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue({ ...logInSessionA, workoutSessionId: 'some-other-session' });

    const res = await request(app)
      .post(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ setNumber: 1 });

    expect(res.status).toBe(404);
    expect(prisma.exerciseSet.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/workouts/:sessionId/exercises/:exerciseLogId/sets/:setId', () => {
  it('positive: the owner can update their own set', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);
    (prisma.exerciseSet.findUnique as jest.Mock).mockResolvedValue(setInLogA);
    (prisma.exerciseSet.update as jest.Mock).mockResolvedValue({ ...setInLogA, weightKg: 65 });

    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ weightKg: 65 });

    expect(res.status).toBe(200);
    expect(res.body.data.weightKg).toBe(65);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets/${setInLogA.id}`)
      .send({ weightKg: 65 });
    expect(res.status).toBe(401);
  });

  it('negative: rejects an RPE outside the 1-10 range', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);

    const res = await request(app)
      .patch(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_A_ID))
      .send({ rpe: 0 });

    expect(res.status).toBe(400);
  });

  it('SECURITY (IDOR): user B owns session-b, but cannot use it to edit a set that actually belongs to user A\'s exercise log', async () => {
    const sessionB = { ...sessionA, id: 'session-b', userId: USER_B_ID };
    // User B's own session passes the ownership check...
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionB);
    // ...but the setId in the URL actually belongs to USER A's exercise log, not anything under session-b
    (prisma.exerciseSet.findUnique as jest.Mock).mockResolvedValue(setInLogA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);

    const res = await request(app)
      .patch(`/api/workouts/${sessionB.id}/exercises/some-log-id/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_B_ID))
      .send({ weightKg: 999 });

    expect(res.status).toBe(404);
    expect(prisma.exerciseSet.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/workouts/:sessionId/exercises/:exerciseLogId/sets/:setId', () => {
  it('positive: the owner can delete their own set', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);
    (prisma.exerciseSet.findUnique as jest.Mock).mockResolvedValue(setInLogA);
    (prisma.exerciseSet.delete as jest.Mock).mockResolvedValue(setInLogA);

    const res = await request(app)
      .delete(`/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(
      `/api/workouts/${sessionA.id}/exercises/${logInSessionA.id}/sets/${setInLogA.id}`
    );
    expect(res.status).toBe(401);
  });

  it('negative: 404 for a session that does not belong to the caller', async () => {
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete(`/api/workouts/nonexistent/exercises/${logInSessionA.id}/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('SECURITY (IDOR): user B cannot delete a set belonging to user A\'s exercise log via their own session id', async () => {
    const sessionB = { ...sessionA, id: 'session-b', userId: USER_B_ID };
    (prisma.workoutSession.findUnique as jest.Mock).mockResolvedValue(sessionB);
    (prisma.exerciseSet.findUnique as jest.Mock).mockResolvedValue(setInLogA);
    (prisma.exerciseLog.findUnique as jest.Mock).mockResolvedValue(logInSessionA);

    const res = await request(app)
      .delete(`/api/workouts/${sessionB.id}/exercises/some-log-id/sets/${setInLogA.id}`)
      .set('Authorization', authHeader(USER_B_ID));

    expect(res.status).toBe(404);
    expect(prisma.exerciseSet.delete).not.toHaveBeenCalled();
  });
});
