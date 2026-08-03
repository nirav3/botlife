import request from 'supertest';

jest.mock('../../src/services/chat.service');
import * as chatService from '../../src/services/chat.service';
import app from '../../src/app';
import { authHeader, USER_A_ID } from '../utils/testHelpers';

const validMessages = [{ role: 'user', text: 'I want to build muscle, 4 days a week.' }];

describe('POST /api/chat/workout-plan', () => {
  it('positive: returns a conversational reply while still gathering info', async () => {
    (chatService.generateWorkoutPlanReply as jest.Mock).mockResolvedValue({
      message: 'Great — what equipment do you have access to?',
      plan: null,
    });

    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: validMessages });

    expect(res.status).toBe(200);
    expect(res.body.data.plan).toBeNull();
    expect(res.body.data.message).toContain('equipment');
    expect(chatService.generateWorkoutPlanReply).toHaveBeenCalledWith(validMessages);
  });

  it('positive: returns a drafted plan once the assistant has enough information', async () => {
    const plan = {
      name: 'Custom Hypertrophy Split',
      difficulty: 'Intermediate',
      goal: 'Hypertrophy',
      daysPerWeek: 4,
      estimatedMinutes: 60,
      tags: [],
      days: [
        {
          dayNumber: 1,
          label: 'Day 1',
          sessionName: 'Push Day',
          exercises: [
            { name: 'Bench Press', muscleGroup: 'Chest', sets: [{ setNumber: 1, targetReps: '8-12' }] },
          ],
        },
      ],
    };
    (chatService.generateWorkoutPlanReply as jest.Mock).mockResolvedValue({
      message: "Here's your plan!",
      plan,
    });

    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: validMessages });

    expect(res.status).toBe(200);
    expect(res.body.data.plan).toEqual(plan);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post('/api/chat/workout-plan').send({ messages: validMessages });
    expect(res.status).toBe(401);
    expect(chatService.generateWorkoutPlanReply).not.toHaveBeenCalled();
  });

  it('negative: rejects an empty messages array', async () => {
    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: [] });

    expect(res.status).toBe(400);
    expect(chatService.generateWorkoutPlanReply).not.toHaveBeenCalled();
  });

  it('negative: rejects a message with an invalid role', async () => {
    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: [{ role: 'system', text: 'hi' }] });

    expect(res.status).toBe(400);
    expect(chatService.generateWorkoutPlanReply).not.toHaveBeenCalled();
  });

  // ─── Compute/cost guardrails ────────────────────────────────────────────────
  it('negative: rejects a conversation with more than 30 turns', async () => {
    const tooManyMessages = Array.from({ length: 31 }, (_, i) => ({ role: 'user', text: `msg ${i}` }));

    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: tooManyMessages });

    expect(res.status).toBe(400);
    expect(chatService.generateWorkoutPlanReply).not.toHaveBeenCalled();
  });

  it('negative: rejects a message longer than 2000 characters', async () => {
    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: [{ role: 'user', text: 'A'.repeat(2001) }] });

    expect(res.status).toBe(400);
    expect(chatService.generateWorkoutPlanReply).not.toHaveBeenCalled();
  });

  it('negative: propagates a 503 when the service reports the AI client isn\'t configured', async () => {
    const { AppError } = jest.requireActual('../../src/middleware/error.middleware');
    (chatService.generateWorkoutPlanReply as jest.Mock).mockRejectedValue(
      new AppError(503, 'AI chat is not configured on this server')
    );

    const res = await request(app)
      .post('/api/chat/workout-plan')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ messages: validMessages });

    expect(res.status).toBe(503);
  });
});

// ─── Rate limiting: per-user, not per-IP ───────────────────────────────────────
describe('SECURITY: chat endpoint rate limiting', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('blocks further chat turns for the same user after the configured max (30/15min)', async () => {
    // Same trick as the auth-limiter test: the limiter's `skip` callback is
    // re-evaluated per request, so flipping NODE_ENV here un-skips it just
    // for this test.
    process.env.NODE_ENV = 'production';
    (chatService.generateWorkoutPlanReply as jest.Mock).mockResolvedValue({ message: 'ok', plan: null });

    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await request(app)
        .post('/api/chat/workout-plan')
        .set('Authorization', authHeader(USER_A_ID))
        .send({ messages: validMessages });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    expect(statuses[30]).toBe(429);
  }, 15000);
});
