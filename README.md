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

The engine analyzes working sets (non-warmup) and first classifies each exercise by name into one of two progression styles:

- **Weight-type** (squats, deadlifts, bench, rows, presses…) — weight goes up, reps stay fixed.
  - Requires 3 consecutive sessions at the same weight averaging ≥ 10 reps/set before suggesting an increase.
  - Increment: +2.5kg for upper body, +5kg for lower body (squat, deadlift, etc.).
  - Example: Bench Press at 83.9kg (185lbs) averaged 10+ reps for 3 sessions → API suggests moving to 86.4kg (190lbs), reps target reset to 8.
- **Reps-type** (pull-ups, push-ups, dips, curls, cable/isolation work…) — reps go up, weight stays fixed.
  - Weight is held constant while the rep target climbs by 2 each session, until avg reps reach a ceiling of 15 for 3 consecutive sessions.
  - Only then does it suggest a (smaller) weight bump — +1.25kg for upper body, +2.5kg for lower body, or "add extra load" for true bodyweight moves with no weight logged — and reset the rep target back down to 8.

Either way, the suggestion also includes a **per-set breakdown for today** (`perSetSuggestions`) instead of one flat number repeated on every row:
- Weight-type: working sets ramp up (~7%/set, floored at 70% of target) to the full target weight on the final set, reps constant.
- Reps-type: weight is identical across all sets, but the rep target tapers slightly across sets (higher on the fresh first set, lower by the last) around the target rep count.

The `/api/progression` endpoint returns two buckets: `ready` (increase now) and `inProgress` (keep going).
