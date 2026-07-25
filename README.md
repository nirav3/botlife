# BodLife API

REST API for the BodLife lifestyle tracking app — gym workouts, progressive overload, weight tracking, and meal plans.

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (Bearer tokens)

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret
```

### 3. Run migrations and generate Prisma client
```bash
npm run db:migrate
npm run db:generate
```

### 4. Seed demo data (optional)
```bash
npm run db:seed
```

### 5. Start dev server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Weight Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/weight` | Log weight entry |
| GET | `/api/weight` | Weight history (paginated) |
| GET | `/api/weight/stats` | Stats: current, avg, trend |
| DELETE | `/api/weight/:id` | Delete entry |

### Workouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workouts` | Create workout session |
| GET | `/api/workouts` | List sessions |
| GET | `/api/workouts/:sessionId` | Get session with exercises + sets |
| PATCH | `/api/workouts/:sessionId` | Update session |
| DELETE | `/api/workouts/:sessionId` | Delete session |
| POST | `/api/workouts/:sessionId/exercises` | Add exercise to session |
| POST | `/api/workouts/:sessionId/exercises/:exerciseLogId/sets` | Log a set |
| PATCH | `/api/workouts/:sessionId/exercises/:exerciseLogId/sets/:setId` | Update set |
| DELETE | `/api/workouts/:sessionId/exercises/:exerciseLogId/sets/:setId` | Delete set |

### Progressive Overload
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/progression` | Suggestions for all recent exercises |
| GET | `/api/progression/:exerciseName` | Suggestion for one exercise |
| GET | `/api/progression/:exerciseName/history` | Raw history for one exercise |

### Meals
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/meals` | Create meal plan |
| GET | `/api/meals` | List meal plans |
| GET | `/api/meals/daily-summary` | Today's totals vs targets |
| GET | `/api/meals/:planId` | Get plan with meals |
| PATCH | `/api/meals/:planId` | Update plan |
| DELETE | `/api/meals/:planId` | Delete plan |
| POST | `/api/meals/:planId/meals` | Add meal to plan |
| POST | `/api/meals/:planId/meals/:mealId/foods` | Add food item |
| DELETE | `/api/meals/:planId/meals/:mealId/foods/:foodId` | Delete food item |

---

## Progressive Overload Logic

The engine analyzes working sets (non-warmup) and suggests increases based on:

- **Consecutive sessions** at the same weight: requires 3 sessions before suggesting increase
- **Avg reps threshold**: must average ≥ 10 reps per set to qualify
- **Increments**: +2.5kg for upper body, +5kg for lower body (squat, deadlift, etc.)

Example: Bench Press at 83.9kg (185lbs) averaged 10+ reps for 3 sessions → API suggests moving to 86.4kg (190lbs).

The `/api/progression` endpoint returns two buckets: `ready` (increase now) and `inProgress` (keep going).
