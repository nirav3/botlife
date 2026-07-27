import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';
import { sendPasswordResetEmail } from '../lib/email';

const SALT_ROUNDS = 12;
const RESET_TOKEN_TTL_MINUTES = 15;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(userId: string, email: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return jwt.sign({ id: userId, email }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name, securityQuestion, securityAnswer } = req.body as {
      email: string;
      password: string;
      name: string;
      securityQuestion?: string;
      securityAnswer?: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Email already in use');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const securityAnswerHash =
      securityAnswer ? await bcrypt.hash(securityAnswer.toLowerCase().trim(), SALT_ROUNDS) : undefined;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        securityQuestion: securityQuestion ?? null,
        securityAnswerHash: securityAnswerHash ?? null,
      },
      select: {
        id: true, email: true, name: true, createdAt: true,
        dateOfBirth: true, sex: true, onboardingSkipped: true,
      },
    });

    const token = signToken(user.id, user.email);
    res.status(201).json({ data: { user, token } });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new AppError(401, 'This account uses Google sign-in. Please continue with Google.');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const token = signToken(user.id, user.email);
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, name: user.name,
          dateOfBirth: user.dateOfBirth, sex: user.sex, onboardingSkipped: user.onboardingSkipped,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idToken } = req.body as { idToken: string };

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.email_verified) {
      throw new AppError(401, 'Google account email is not verified');
    }

    const { sub: googleId, name } = payload;
    // Match the normalization register/login apply via express-validator's
    // normalizeEmail() (e.g. strips dots from Gmail addresses), so a Google
    // login resolves to the same row as an existing password account.
    const email = validator.normalizeEmail(payload.email) || payload.email;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // No account linked to this Google ID yet — check by email.
      // Google verifies email ownership, so it's safe to link to an
      // existing password-based account (which has no verification at all).
      const existing = await prisma.user.findUnique({ where: { email } });

      user = existing
        ? await prisma.user.update({ where: { id: existing.id }, data: { googleId } })
        : await prisma.user.create({
            data: {
              email,
              name: name ?? email,
              googleId,
              passwordHash: null,
            },
          });
    }

    const token = signToken(user.id, user.email);
    res.json({
      data: {
        user: {
          id: user.id, email: user.email, name: user.name,
          dateOfBirth: user.dateOfBirth, sex: user.sex, onboardingSkipped: user.onboardingSkipped,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, name: true, unitSystem: true, createdAt: true,
        dateOfBirth: true, sex: true, onboardingSkipped: true, googleId: true,
      },
    });

    if (!user) throw new AppError(404, 'User not found');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, unitSystem, dateOfBirth, sex, onboardingSkipped } = req.body as {
      name?: string;
      unitSystem?: 'METRIC' | 'IMPERIAL';
      dateOfBirth?: string;
      sex?: 'MALE' | 'FEMALE';
      onboardingSkipped?: boolean;
    };

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(unitSystem !== undefined && { unitSystem }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(sex !== undefined && { sex }),
        ...(onboardingSkipped !== undefined && { onboardingSkipped }),
      },
      select: {
        id: true, email: true, name: true, unitSystem: true, createdAt: true,
        dateOfBirth: true, sex: true, onboardingSkipped: true,
      },
    });

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

// ─── Step 1: request a reset link ─────────────────────────────────────────────
// Responds identically whether or not the account exists, so the endpoint
// can't be used to enumerate registered emails. If the account exists, an
// unguessable token is emailed to it — the token itself (not the answer to
// the security question) is what proves the requester owns the inbox.
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiresAt },
      });

      const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ message: "If an account exists for that email, we've sent password reset instructions." });
  } catch (err) {
    next(err);
  }
};

// ─── Step 2: look up the security question for a valid reset link ────────────
// Only reachable with the actual emailed token (32 random bytes — not
// guessable), so it's safe to reveal the question here even though doing so
// at the forgot-password step would leak account existence.
export const getResetQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params as { token: string };

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new AppError(400, 'Reset link is invalid or has expired');
    }

    // Google-only accounts have no password to reset — same rule login
    // already enforces. The client uses this to show a "use Google" message
    // instead of a password form, without ever having a real password set.
    res.json({
      data: {
        securityQuestion: user.securityQuestion,
        requiresGoogleSignIn: !user.passwordHash,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Step 3: exchange the emailed token (+ security answer, if set) for a
// new password. The token proves inbox access; the answer, when the account
// has one on file, is a second factor on top of it — neither is sufficient
// alone to take over the account.
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, answer, password } = req.body as { token: string; answer?: string; password: string };

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new AppError(400, 'Reset token is invalid or has expired');
    }

    // Belt-and-suspenders: getResetQuestion already steers the client away
    // from this for Google-only accounts, but never take a password from a
    // direct API call just because it skipped that step.
    if (!user.passwordHash) {
      throw new AppError(400, 'This account uses Google sign-in. Please continue with Google.');
    }

    if (user.securityAnswerHash) {
      const match = answer ? await bcrypt.compare(answer.toLowerCase().trim(), user.securityAnswerHash) : false;
      if (!match) throw new AppError(400, 'Incorrect answer');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};
