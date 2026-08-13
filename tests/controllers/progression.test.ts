import request from 'supertest';

jest.mock('../../src/services/progression.service');
import * as progressionService from '../../src/services/progression.service';
import app from '../../src/app';
import { authHeader, USER_A_ID } from '../utils/testHelpers';

const readySuggestion = {
  exerciseName: 'Bench Press',
  progressionType: 'weight',
  currentWeightKg: 60,
  suggestedWeightKg: 62.5,
  currentReps: 10,
  suggestedReps: 8,
  readyForProgression: true,
  reason: 'Time to increase!',
  reasonKey: 'weight_ready',
  reasonParams: { currentWeightKg: 60, currentReps: 10, incrementKg: 2.5, consecutiveSessions: 3 },
  perSetSuggestions: [{ setNumber: 1, weightKg: 62.5, reps: 8 }],
};

const notReadySuggestion = {
  ...readySuggestion,
  exerciseName: 'Squat',
  readyForProgression: false,
  reason: 'Keep going.',
};

describe('GET /api/progression', () => {
  it('positive: splits suggestions into ready vs in-progress buckets', async () => {
    (progressionService.getAllProgressionSuggestions as jest.Mock).mockResolvedValue([
      readySuggestion,
      notReadySuggestion,
    ]);

    const res = await request(app).get('/api/progression').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.ready).toHaveLength(1);
    expect(res.body.data.inProgress).toHaveLength(1);
    expect(res.body.data.ready[0].exerciseName).toBe('Bench Press');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/progression');
    expect(res.status).toBe(401);
  });

  it('negative: returns an empty-but-valid shape for a user with no workout history', async () => {
    (progressionService.getAllProgressionSuggestions as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/progression').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.ready).toEqual([]);
  });

  it('negative: a service-layer failure surfaces as a generic 500', async () => {
    (progressionService.getAllProgressionSuggestions as jest.Mock).mockRejectedValue(new Error('db exploded'));

    const res = await request(app).get('/api/progression').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/progression/:exerciseName', () => {
  it('positive: returns a suggestion for a known exercise', async () => {
    (progressionService.getProgressionSuggestion as jest.Mock).mockResolvedValue(readySuggestion);

    const res = await request(app)
      .get('/api/progression/Bench%20Press')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.exerciseName).toBe('Bench Press');
    expect(progressionService.getProgressionSuggestion).toHaveBeenCalledWith(USER_A_ID, 'Bench Press');
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/progression/Bench%20Press');
    expect(res.status).toBe(401);
  });

  it('negative: 404 for an exercise with no logged history', async () => {
    (progressionService.getProgressionSuggestion as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/progression/Never%20Done%20This')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
  });

  it('negative: safely decodes an exercise name containing special characters without crashing', async () => {
    (progressionService.getProgressionSuggestion as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/progression/${encodeURIComponent("Arnold Press (dumbbell) & Curl")}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404); // handled gracefully, not a 500
    expect(progressionService.getProgressionSuggestion).toHaveBeenCalledWith(
      USER_A_ID,
      'Arnold Press (dumbbell) & Curl'
    );
  });
});

describe('GET /api/progression/:exerciseName/history', () => {
  it('positive: returns session-by-session history for an exercise', async () => {
    (progressionService.getExerciseHistory as jest.Mock).mockResolvedValue([
      { sessionDate: new Date('2024-06-01'), weightKg: 60, totalReps: 30, avgRepsPerSet: 10, sets: 3 },
    ]);

    const res = await request(app)
      .get('/api/progression/Bench%20Press/history')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/progression/Bench%20Press/history');
    expect(res.status).toBe(401);
  });

  it('negative: returns an empty array (not an error) for an exercise never logged', async () => {
    (progressionService.getExerciseHistory as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/progression/Never%20Done/history')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('negative: respects a custom "limit" query param', async () => {
    (progressionService.getExerciseHistory as jest.Mock).mockResolvedValue([]);

    await request(app)
      .get('/api/progression/Bench%20Press/history?limit=3')
      .set('Authorization', authHeader(USER_A_ID));

    expect(progressionService.getExerciseHistory).toHaveBeenCalledWith(USER_A_ID, 'Bench Press', 3);
  });
});
