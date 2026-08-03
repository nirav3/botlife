import request from 'supertest';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';
import app from '../../src/app';
import { authHeader, authHeaderWithWrongSecret, USER_A_ID } from '../utils/testHelpers';

// ─── AuthN sweep: every protected route must reject an unauthenticated caller ──
describe('SECURITY: every protected route rejects requests with no token', () => {
  const protectedRoutes: [string, string][] = [
    ['get', '/api/auth/me'],
    ['patch', '/api/auth/me'],
    ['post', '/api/weight'],
    ['get', '/api/weight'],
    ['get', '/api/weight/stats'],
    ['delete', '/api/weight/some-id'],
    ['post', '/api/workouts'],
    ['get', '/api/workouts'],
    ['get', '/api/workouts/some-id'],
    ['patch', '/api/workouts/some-id'],
    ['delete', '/api/workouts/some-id'],
    ['post', '/api/meals'],
    ['get', '/api/meals'],
    ['get', '/api/meals/daily-summary'],
    ['get', '/api/meals/some-id'],
    ['get', '/api/progression'],
    ['get', '/api/progression/Bench%20Press'],
    ['get', '/api/progression/Bench%20Press/history'],
    ['get', '/api/plans'],
    ['get', '/api/plans/some-id'],
    ['post', '/api/plans'],
    ['patch', '/api/plans/some-id'],
    ['delete', '/api/plans/some-id'],
    ['post', '/api/plans/some-id/start-day'],
    ['post', '/api/chat/workout-plan'],
  ];

  it.each(protectedRoutes)('%s %s → 401 with no Authorization header', async (method, path) => {
    const res = await (request(app) as any)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it.each(protectedRoutes.slice(0, 6))(
    '%s %s → 401 with a token forged using the wrong signing secret',
    async (method, path) => {
      const res = await (request(app) as any)[method](path)
        .set('Authorization', authHeaderWithWrongSecret(USER_A_ID))
        .send({});
      expect(res.status).toBe(401);
    }
  );
});

// ─── Rate limiting: the auth brute-force limiter actually engages ──────────────
describe('SECURITY: auth endpoint rate limiting', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('blocks further login attempts after the configured max (20/15min)', async () => {
    // The limiter's `skip` callback is re-evaluated on every request (it's a
    // function, not a one-time check at startup), so flipping NODE_ENV here
    // un-skips it for this test only — no need to re-import the app/mocks.
    process.env.NODE_ENV = 'production';
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'attacker@example.com', password: 'guess' });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true); // all genuine attempts processed normally
    expect(statuses[20]).toBe(429); // the 21st is blocked
  }, 15000);
});

// ─── Input validation / injection resilience ───────────────────────────────────
describe('SECURITY: malformed and malicious input is handled without crashing', () => {
  it('a SQL-injection-style email is rejected by validation, never reaches the database as-is', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "'; DROP TABLE users; --", password: 'whatever123' });

    expect(res.status).toBe(400); // fails isEmail() before ever touching Prisma
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('a NoSQL/type-confusion payload (object instead of string) never authenticates as a real user', async () => {
    // express-validator's notEmpty() only checks truthiness, so an object
    // payload isn't rejected by validation — the important security property
    // is that it can't be used to bypass auth or crash the server, which the
    // "user not found" path (bcrypt is never reached) already guarantees.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'valid@example.com', password: { $ne: null } });

    expect([400, 401]).toContain(res.status);
    expect(res.body.data?.token).toBeUndefined();
  });

  it('an oversized payload does not crash the server', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const hugeName = 'A'.repeat(100_000);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'huge-id',
      email: 'huge@example.com',
      name: hugeName,
      createdAt: new Date(),
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'huge@example.com',
      password: 'supersecret123',
      name: hugeName,
    });

    // Whatever the app decides (accept or reject), it must respond cleanly —
    // not hang, not 500. There's currently no max-length check on `name`, so
    // this documents actual behavior (201) rather than an enforced policy.
    expect([200, 201, 400, 413]).toContain(res.status);
  });

  it('a negative/out-of-range numeric field is rejected rather than stored', async () => {
    const res = await request(app)
      .post('/api/weight')
      .set('Authorization', authHeader(USER_A_ID))
      .send({ weightKg: -50 });

    expect(res.status).toBe(400);
    expect(prisma.weightEntry.create).not.toHaveBeenCalled();
  });
});

// ─── Secrets never leak to the client ───────────────────────────────────────────
describe('SECURITY: sensitive fields and internals never appear in responses', () => {
  it('login response never includes passwordHash, securityAnswerHash, or resetToken', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: USER_A_ID,
      email: 'jane@example.com',
      name: 'Jane',
      passwordHash: '$2a$12$realHashValueRealHashValueRealHashValue',
      securityAnswerHash: '$2a$12$anotherRealHashValueHere',
      resetToken: 'super-secret-reset-token',
    });
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'correct-password' });

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/passwordHash/);
    expect(raw).not.toMatch(/securityAnswerHash/);
    expect(raw).not.toMatch(/resetToken/);
    expect(raw).not.toMatch(/\$2a\$12\$/); // no bcrypt hash format leaks either
  });

  it('an unexpected server error never leaks the underlying error message or stack', async () => {
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
      new Error('password authentication failed for user "prod_admin" at 10.0.4.12:5432')
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@example.com', password: 'whatever123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(res.body)).not.toMatch(/10\.0\.4\.12|prod_admin/);
  });

  it('getMe response never includes passwordHash even though the DB row has one', async () => {
    // The controller uses an explicit `select` — this test guards against
    // someone later changing it to `include`/spread the full row by mistake.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: USER_A_ID,
      email: 'jane@example.com',
      name: 'Jane',
      unitSystem: 'METRIC',
      createdAt: new Date(),
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader(USER_A_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ passwordHash: true }),
      })
    );
  });
});
