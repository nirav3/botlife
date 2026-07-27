import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, googleAuth, getMe, updateMe, forgotPassword, verifySecurityAnswer, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('securityQuestion').optional().trim().notEmpty(),
    body('securityAnswer').optional().trim().notEmpty(),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  login
);

router.post(
  '/google',
  [body('idToken').notEmpty().withMessage('idToken is required')],
  validate,
  googleAuth
);

router.get('/me', authenticate, getMe);

router.patch(
  '/me',
  authenticate,
  [
    body('unitSystem').optional().isIn(['METRIC', 'IMPERIAL']),
    body('name').optional().trim().notEmpty(),
    body('sex').optional().isIn(['MALE', 'FEMALE']),
    body('onboardingSkipped').optional().isBoolean(),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('dateOfBirth must be a valid date')
      .custom((value) => {
        const age = (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 5 || age > 120) throw new Error('dateOfBirth must reflect a realistic age');
        return true;
      }),
  ],
  validate,
  updateMe
);

// Password reset flow (no email required — uses security question)
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  '/verify-answer',
  [
    body('email').isEmail().normalizeEmail(),
    body('answer').trim().notEmpty(),
  ],
  validate,
  verifySecurityAnswer
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  resetPassword
);

export default router;
