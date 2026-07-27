import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../../src/lib/prisma');
import { prisma } from '../../src/lib/prisma';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import app from '../../src/app';
import { authHeader, authHeaderWithWrongSecret, authHeaderExpired } from '../utils/testHelpers';

const baseUser = {
  id: 'user-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  passwordHash: '$2a$12$validhashvaluevaluevaluevaluevaluevalue',
  googleId: null as string | null,
  unitSystem: 'METRIC' as const,
  securityQuestion: 'What is your pet name?',
  securityAnswerHash: null as string | null,
  resetToken: null as string | null,
  resetTokenExpiresAt: null as Date | null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('POST /api/auth/register', () => {
  it('positive: creates a user and returns 201 with a token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'new@example.com',
      name: 'New User',
      createdAt: new Date('2024-01-01'),
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      password: 'supersecret123',
      name: 'New User',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('new@example.com');
    expect(res.body.data.token).toEqual(expect.any(String));
    // Never return the password hash to the client
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('negative: rejects a duplicate email with 409', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app).post('/api/auth/register').send({
      email: baseUser.email,
      password: 'supersecret123',
      name: 'Jane Doe',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('negative: rejects a password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@example.com',
      password: 'short',
      name: 'Short Pw',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('negative: rejects a missing/blank name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@example.com',
      password: 'supersecret123',
      name: '   ',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  it('positive: logs in with correct credentials and returns a token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await request(app).post('/api/auth/login').send({
      email: baseUser.email,
      password: 'correct-password',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(baseUser.email);
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('negative: wrong password returns a generic 401 (no hint it was the password)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const res = await request(app).post('/api/auth/login').send({
      email: baseUser.email,
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('negative: non-existent email returns the SAME generic 401 (no user enumeration)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'whatever123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('negative: a Google-only account (no password set) cannot log in with a password', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, passwordHash: null });

    const res = await request(app).post('/api/auth/login').send({
      email: baseUser.email,
      password: 'anything123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Google sign-in/);
  });
});

describe('POST /api/auth/google', () => {
  it('positive: verified Google token creates a new account and returns a session', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'googleuser@example.com',
        email_verified: true,
        name: 'Google User',
      }),
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null); // no match by googleId or email
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'google-user-id',
      email: 'googleuser@example.com',
      name: 'Google User',
      googleId: 'google-sub-123',
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'valid-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('googleuser@example.com');
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('negative: unverified Google email is rejected', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-456',
        email: 'unverified@example.com',
        email_verified: false,
      }),
    });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'unverified-token' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not verified/);
  });

  it('negative: missing idToken fails validation before hitting Google', async () => {
    const res = await request(app).post('/api/auth/google').send({});

    expect(res.status).toBe(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('negative: a forged/invalid Google token is rejected without leaking internals', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong number of segments in token'));

    const res = await request(app).post('/api/auth/google').send({ idToken: 'garbage-token' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(res.body.error).not.toMatch(/segments/); // underlying library error never leaks to the client
  });
});

describe('GET /api/auth/me', () => {
  it('positive: returns the current user for a valid token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: baseUser.id,
      email: baseUser.email,
      name: baseUser.name,
      unitSystem: baseUser.unitSystem,
      createdAt: baseUser.createdAt,
    });

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader(baseUser.id, baseUser.email));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(baseUser.id);
  });

  it('negative: no Authorization header at all is rejected', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authorization token required');
  });

  it('negative: a token signed with the wrong secret (forged) is rejected', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', authHeaderWithWrongSecret(baseUser.id));

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('negative: a valid token for a since-deleted user returns 404, not the old data', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader(baseUser.id));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });
});

describe('PATCH /api/auth/me', () => {
  it('positive: updates the display name', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({ ...baseUser, name: 'Jane Updated' });

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ name: 'Jane Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Jane Updated');
  });

  it('negative: rejected without a valid session', async () => {
    const res = await request(app).patch('/api/auth/me').send({ name: 'Nope' });
    expect(res.status).toBe(401);
  });

  it('negative: rejects an invalid unitSystem value', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ unitSystem: 'FURLONGS' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('negative: rejects a blank name', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/auth/me — profile fields for weight-suggestion defaults', () => {
  it('positive: saves a valid dateOfBirth and sex', async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({
      ...baseUser,
      dateOfBirth: new Date('1994-05-01'),
      sex: 'FEMALE',
    });

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ dateOfBirth: '1994-05-01', sex: 'FEMALE' });

    expect(res.status).toBe(200);
    expect(res.body.data.sex).toBe('FEMALE');
  });

  it('negative: rejects an invalid sex value (not MALE/FEMALE)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ sex: 'ROBOT' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('negative: rejects a malformed dateOfBirth string', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ dateOfBirth: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('negative: rejects an unrealistic age (e.g. a birthdate implying 200 years old)', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader(baseUser.id))
      .send({ dateOfBirth: '1820-01-01' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('Password reset flow', () => {
  it('positive: forgotPassword generates and stores a reset token for an existing account', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app).post('/api/auth/forgot-password').send({ email: baseUser.email });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseUser.id },
        data: expect.objectContaining({
          resetToken: expect.any(String),
          resetTokenExpiresAt: expect.any(Date),
        }),
      })
    );
  });

  it('negative: forgotPassword returns the SAME response for an unknown email — never confirms account existence', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);
    const knownRes = await request(app).post('/api/auth/forgot-password').send({ email: baseUser.email });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const unknownRes = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });

    expect(unknownRes.status).toBe(200);
    expect(unknownRes.body).toEqual(knownRes.body);
    expect(prisma.user.update).toHaveBeenCalledTimes(1); // only for the known account
  });

  it("negative: forgotPassword never returns a resetToken or securityQuestion in the response body", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
    (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app).post('/api/auth/forgot-password').send({ email: baseUser.email });

    expect(JSON.stringify(res.body)).not.toMatch(/resetToken|securityQuestion/);
  });

  it('positive: getResetQuestion returns the security question for a valid, unexpired token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app).get('/api/auth/reset-password/valid-token');

    expect(res.status).toBe(200);
    expect(res.body.data.securityQuestion).toBe(baseUser.securityQuestion);
    expect(res.body.data.requiresGoogleSignIn).toBe(false);
  });

  it('positive: getResetQuestion flags a Google-only account (no passwordHash) instead of offering a password form', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      passwordHash: null,
      googleId: 'google-sub-789',
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app).get('/api/auth/reset-password/valid-token');

    expect(res.status).toBe(200);
    expect(res.body.data.requiresGoogleSignIn).toBe(true);
  });

  it('negative: getResetQuestion rejects an unknown token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/auth/reset-password/not-a-real-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/);
  });

  it('negative: getResetQuestion rejects an expired token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      resetToken: 'stale-token',
      resetTokenExpiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).get('/api/auth/reset-password/stale-token');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/);
  });

  it('negative: resetPassword refuses a Google-only account even with a valid token — mirrors the login error', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      passwordHash: null,
      googleId: 'google-sub-789',
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Google sign-in/);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('positive: resetPassword succeeds with a valid token when the account has no security question', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      securityAnswerHash: null,
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ resetToken: null, resetTokenExpiresAt: null }) })
    );
  });

  it('positive: resetPassword succeeds with a valid token AND the correct security answer', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      securityAnswerHash: 'somehash',
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    (prisma.user.update as jest.Mock).mockResolvedValue(baseUser);
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', answer: 'Fluffy', password: 'newpassword123' });

    expect(res.status).toBe(200);
  });

  it('negative: resetPassword rejects a valid token with the wrong security answer — the token alone is not enough', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      securityAnswerHash: 'somehash',
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const bcrypt = require('bcryptjs');
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', answer: 'wrong answer', password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Incorrect answer');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('negative: resetPassword rejects a valid token with a missing answer when one is required', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...baseUser,
      securityAnswerHash: 'somehash',
      resetToken: 'valid-token',
      resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'valid-token', password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Incorrect answer');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('negative: resetPassword rejects an expired or unknown token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'not-a-real-token', password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/);
  });
});

describe('Auth security: JWT edge cases (applies to any authenticated route)', () => {
  it('rejects a malformed Authorization header missing the Bearer prefix', async () => {
    const token = jwt.sign({ id: baseUser.id, email: baseUser.email }, process.env.JWT_SECRET as string);
    const res = await request(app).get('/api/auth/me').set('Authorization', token); // no "Bearer " prefix
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authorization token required');
  });

  it('rejects an expired token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', authHeaderExpired(baseUser.id));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('rejects a syntactically garbage token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });
});
