import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes';
import weightRoutes from './routes/weight.routes';
import workoutRoutes from './routes/workout.routes';
import mealRoutes from './routes/meal.routes';
import progressionRoutes from './routes/progression.routes';
import plansRoutes from './routes/plans.routes';
import { errorHandler } from './middleware/error.middleware';
import { notFound } from './middleware/notFound.middleware';
import { swaggerSpec } from './lib/swagger';

// Import doc files so swagger-jsdoc picks up the JSDoc annotations
import './docs/auth.docs';
import './docs/weight.docs';
import './docs/workout.docs';
import './docs/meal.docs';
import './docs/progression.docs';
import './docs/plans.docs';

const app = express();

// Render (and most PaaS hosts) terminate TLS at a proxy in front of the app,
// so without this req.protocol always reports 'http' — which would leak
// into password-reset links built from it as a fallback for APP_URL.
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────────────────────
// Disable CSP on static assets — it blocks Vite's ES module scripts.
// Relax COOP to allow-popups — the default 'same-origin' silently breaks
// Google Identity Services' popup/iframe postMessage handshake, which is
// why the Sign-in-with-Google button was rendering as an empty 0x0 iframe.
// All other helmet protections (HSTS, X-Frame-Options, etc.) remain active.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);
app.use(cors());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min window
  max: parseInt(process.env.RATE_LIMIT_MAX || '500'),               // raised: 500 req/window
  message: { error: 'Too many requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',               // no limit in dev
});
app.use(limiter);

// Tighter limit on auth endpoints only (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 login/register attempts per window
  skip: () => process.env.NODE_ENV === 'test', // tests exercise auth routes far more than a real user would; the limiter itself is covered by a dedicated test
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// ─── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Static frontend (production build) ──────────────────────────────────────
// Resolve from project root so the path is correct whether running via
// ts-node-dev (src/) or compiled JS (dist/).
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Swagger UI ───────────────────────────────────────────────────────────────
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BodLife API Docs',
  swaggerOptions: {
    persistAuthorization: true,   // keeps the JWT between page refreshes
  },
}));

// Expose raw spec for tooling (Postman import, etc.)
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/plans', plansRoutes);

// ─── SPA fallback — must come after API routes and before error handler ───────
// Any non-API route that doesn't match a static file serves index.html
// so React Router can handle client-side navigation (e.g. /workouts/123)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/docs')) return next();
  res.sendFile(path.join(publicDir, 'index.html'), (err) => {
    if (err) next(); // fall through to 404 handler if public/ not built yet
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
export default app;
