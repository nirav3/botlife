import request from 'supertest';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import app from '../../src/app';
import { authHeader, USER_A_ID, USER_B_ID } from '../utils/testHelpers';

const sampleEntry = {
  id: 'entry-1',
  userId: USER_A_ID,
  weightKg: 82.5,
  note: 'Morning, fasted',
  loggedAt: new Date('2024-06-01'),
  createdAt: new Date('2024-06-01'),
};

describe('POST /api/weight', () => {
  it('positive: logs a valid weight entry', async () => {
    (prisma.weightEntry.create as jest.Mock).mockResolvedValue(sampleEntry);

    const res = await request(app)
      .post('/api/weight')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ weightKg: 82.5, note: 'Morning, fasted' });

    expect(res.status).toBe(201);
    expect(res.body.data.weightKg).toBe(82.5);
  });

  it('negative: rejects a weight below the sane minimum (5kg)', async () => {
    const res = await request(app)
      .post('/api/weight')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ weightKg: 5 });

    expect(res.status).toBe(400);
    expect(prisma.weightEntry.create).not.toHaveBeenCalled();
  });

  it('negative: rejects a non-numeric weight', async () => {
    const res = await request(app)
      .post('/api/weight')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ weightKg: 'eighty' });

    expect(res.status).toBe(400);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).post('/api/weight').send({ weightKg: 82.5 });
    expect(res.status).toBe(401);
    expect(prisma.weightEntry.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/weight', () => {
  it('positive: returns a paginated history for the authenticated user', async () => {
    (prisma.weightEntry.findMany as jest.Mock).mockResolvedValue([sampleEntry]);
    (prisma.weightEntry.count as jest.Mock).mockResolvedValue(1);

    const res = await request(app).get('/api/weight').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
    // Confirms the query is scoped to the calling user, not all users
    expect(prisma.weightEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: USER_A_ID }) })
    );
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/weight');
    expect(res.status).toBe(401);
  });

  it('negative: rejects an out-of-range page number', async () => {
    const res = await request(app)
      .get('/api/weight?page=0')
      .set('Authorization', authHeader(USER_A_ID));
    expect(res.status).toBe(400);
  });

  it('negative: rejects a limit above the allowed max (100)', async () => {
    const res = await request(app)
      .get('/api/weight?limit=1000')
      .set('Authorization', authHeader(USER_A_ID));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/weight/stats', () => {
  it('positive: computes current/starting/trend stats from history', async () => {
    (prisma.weightEntry.findMany as jest.Mock).mockResolvedValue([
      { weightKg: 85, loggedAt: new Date('2024-01-01') },
      { weightKg: 82.5, loggedAt: new Date() },
    ]);

    const res = await request(app).get('/api/weight/stats').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.current).toBe(82.5);
    expect(res.body.data.starting).toBe(85);
    expect(res.body.data.totalChange).toBeCloseTo(-2.5);
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).get('/api/weight/stats');
    expect(res.status).toBe(401);
  });

  it('negative: returns a null-data message rather than crashing when history is empty', async () => {
    (prisma.weightEntry.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/weight/stats').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('negative: a database failure surfaces as a generic 500, not a stack trace', async () => {
    (prisma.weightEntry.findMany as jest.Mock).mockRejectedValue(new Error('connection terminated unexpectedly'));

    const res = await request(app).get('/api/weight/stats').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toMatch(/connection terminated/);
  });
});

describe('DELETE /api/weight/:id', () => {
  it('positive: the owner can delete their own entry', async () => {
    (prisma.weightEntry.findUnique as jest.Mock).mockResolvedValue(sampleEntry);
    (prisma.weightEntry.delete as jest.Mock).mockResolvedValue(sampleEntry);

    const res = await request(app)
      .delete(`/api/weight/${sampleEntry.id}`)
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(prisma.weightEntry.delete).toHaveBeenCalledWith({ where: { id: sampleEntry.id } });
  });

  it('negative: rejects the request with no auth token', async () => {
    const res = await request(app).delete(`/api/weight/${sampleEntry.id}`);
    expect(res.status).toBe(401);
  });

  it('negative: 404 for an id that does not exist', async () => {
    (prisma.weightEntry.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/weight/does-not-exist')
      .set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(404);
    expect(prisma.weightEntry.delete).not.toHaveBeenCalled();
  });

  it('SECURITY (IDOR): user B cannot delete user A\'s weight entry by guessing its id', async () => {
    (prisma.weightEntry.findUnique as jest.Mock).mockResolvedValue(sampleEntry); // owned by USER_A_ID

    const res = await request(app)
      .delete(`/api/weight/${sampleEntry.id}`)
      .set('Authorization', authHeader(USER_B_ID)); // attacker's own valid token

    expect(res.status).toBe(404); // not 403 — doesn't confirm the resource exists either
    expect(prisma.weightEntry.delete).not.toHaveBeenCalled();
  });
});
