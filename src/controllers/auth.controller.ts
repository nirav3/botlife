import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import validator from 'validator';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../types';

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
      select: { id: true, email: true, name: true, createdAt: true },
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
        user: { id: user.id, email: user.email, name: user.name },
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
        user: { id: user.id, email: user.email, name: user.name },
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
      select: { id: true, email: true, name: true, unitSystem: true, createdAt: true },
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
    const { name, unitSystem } = req.body as {
      name?: string;
      unitSystem?: 'METRIC' | 'IMPERIAL';
    };

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(unitSystem !== undefined && { unitSystem }),
      },
      select: { id: true, email: true, name: true, unitSystem: true, createdAt: true },
    });

    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};

// ─── Step 1: look up user and return their security question ─────────────────
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { securityQuestion: true },
    });

    // Always return 200 — don't leak whether the email exists
    if (!user || !user.securityQuestion) {
      res.json({
        data: { securityQuestion: null },
        message: 'No security question set for this account',
      });
      return;
    }

    res.json({ data: { securityQuestion: user.securityQuestion } });
  } catch (err) {
    next(err);
  }
};

// ─── Step 2: verify the answer, return a short-lived reset token ─────────────
export const verifySecurityAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, answer } = req.body as { email: string; answer: string };

    const user = await prisma.user.findUnique({ where: { email } });

    // Generic error — don't reveal whether email exists or answer is wrong
    const genericError = new AppError(400, 'Incorrect answer');

    if (!user || !user.securityAnswerHash) throw genericError;

    const match = await bcrypt.compare(answer.toLowerCase().trim(), user.securityAnswerHash);
    if (!match) throw genericError;

    // Generate a short-lived opaque reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiresAt },
    });

    res.json({
      data: { resetToken },
      message: `Token valid for ${RESET_TOKEN_TTL_MINUTES} minutes`,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Step 3: exchange token for a new password ───────────────────────────────
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };

    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new AppError(400, 'Reset token is invalid or has expired');
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
