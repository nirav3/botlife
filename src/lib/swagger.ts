import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BodLife API',
      version: '1.0.0',
      description:
        'REST API for the BodLife lifestyle tracking app — gym workouts, progressive overload, weight tracking, and meal plans.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        // ── Auth ────────────────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', minLength: 8, example: 'secret123' },
            name: { type: 'string', example: 'John Doe' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            password: { type: 'string', example: 'secret123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string', example: 'eyJhbGci...' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clxyz123' },
            email: { type: 'string', example: 'john@example.com' },
            name: { type: 'string', example: 'John Doe' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Weight ──────────────────────────────────────────────────────────
        WeightEntry: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            weightKg: { type: 'number', example: 83.5 },
            note: { type: 'string', nullable: true },
            loggedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WeightStats: {
          type: 'object',
          properties: {
            current: { type: 'number', example: 83.5 },
            starting: { type: 'number', example: 90.0 },
            min: { type: 'number', example: 83.5 },
            max: { type: 'number', example: 90.5 },
            avg: { type: 'number', example: 86.8 },
            totalChange: { type: 'number', example: -6.5 },
            weeklyTrend: { type: 'number', nullable: true, example: -0.5 },
            totalEntries: { type: 'integer', example: 30 },
          },
        },
        // ── Workouts ────────────────────────────────────────────────────────
        WorkoutSession: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            name: { type: 'string', example: 'Push Day' },
            notes: { type: 'string', nullable: true },
            startedAt: { type: 'string', format: 'date-time' },
            endedAt: { type: 'string', format: 'date-time', nullable: true },
            exerciseLogs: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExerciseLog' },
            },
            plan: {
              type: 'object',
              nullable: true,
              description: 'Present only when this session was started from a plan. Only difficulty is included here (used to notch down the no-history starting-weight estimate) — fetch /api/plans/{id} for the full plan.',
              properties: {
                difficulty: { type: 'string', nullable: true, example: 'Beginner' },
              },
            },
          },
        },
        ExerciseLog: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            workoutSessionId: { type: 'string' },
            exerciseName: { type: 'string', example: 'Bench Press' },
            muscleGroup: { type: 'string', nullable: true, example: 'Chest' },
            orderIndex: { type: 'integer', example: 0 },
            notes: { type: 'string', nullable: true },
            sets: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExerciseSet' },
            },
          },
        },
        ExerciseSet: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            exerciseLogId: { type: 'string' },
            setNumber: { type: 'integer', example: 1 },
            weightKg: { type: 'number', nullable: true, example: 83.9 },
            reps: { type: 'integer', nullable: true, example: 10 },
            durationSecs: { type: 'integer', nullable: true },
            rpe: { type: 'number', nullable: true, example: 8 },
            isWarmup: { type: 'boolean', example: false },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Meals ───────────────────────────────────────────────────────────
        MealPlan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            name: { type: 'string', example: 'Lean Bulk' },
            targetCalories: { type: 'integer', nullable: true, example: 2800 },
            targetProteinG: { type: 'integer', nullable: true, example: 200 },
            targetCarbsG: { type: 'integer', nullable: true, example: 300 },
            targetFatG: { type: 'integer', nullable: true, example: 80 },
            isActive: { type: 'boolean', example: true },
            meals: { type: 'array', items: { $ref: '#/components/schemas/Meal' } },
          },
        },
        Meal: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            mealPlanId: { type: 'string' },
            name: { type: 'string', example: 'Breakfast' },
            loggedAt: { type: 'string', format: 'date-time' },
            foodItems: { type: 'array', items: { $ref: '#/components/schemas/FoodItem' } },
          },
        },
        FoodItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            mealId: { type: 'string' },
            name: { type: 'string', example: 'Chicken Breast' },
            quantity: { type: 'number', example: 200 },
            unit: { type: 'string', example: 'g' },
            calories: { type: 'number', example: 330 },
            proteinG: { type: 'number', example: 62 },
            carbsG: { type: 'number', example: 0 },
            fatG: { type: 'number', example: 7 },
          },
        },
        DailySummary: {
          type: 'object',
          properties: {
            date: { type: 'string', example: '2026-06-27' },
            meals: { type: 'array', items: { $ref: '#/components/schemas/Meal' } },
            totals: {
              type: 'object',
              properties: {
                calories: { type: 'number', example: 2450.0 },
                proteinG: { type: 'number', example: 185.5 },
                carbsG: { type: 'number', example: 260.0 },
                fatG: { type: 'number', example: 72.0 },
              },
            },
            targets: {
              nullable: true,
              type: 'object',
              properties: {
                calories: { type: 'integer', nullable: true },
                proteinG: { type: 'integer', nullable: true },
                carbsG: { type: 'integer', nullable: true },
                fatG: { type: 'integer', nullable: true },
              },
            },
          },
        },
        // ── Progression ─────────────────────────────────────────────────────
        ProgressionSuggestion: {
          type: 'object',
          properties: {
            exerciseName: { type: 'string', example: 'Bench Press' },
            progressionType: {
              type: 'string',
              enum: ['weight', 'reps'],
              example: 'weight',
              description: "'weight' exercises progress by adding load (reps held constant); 'reps' exercises progress by adding reps (weight held constant) until a rep ceiling triggers a small load increase.",
            },
            currentWeightKg: { type: 'number', example: 83.9 },
            suggestedWeightKg: { type: 'number', example: 86.4 },
            currentReps: { type: 'integer', example: 10 },
            suggestedReps: { type: 'integer', nullable: true, example: 8 },
            readyForProgression: { type: 'boolean', example: true },
            reason: {
              type: 'string',
              example: "You've hit 3 sessions at 83.9kg averaging 10 reps. Time to increase by 2.5kg!",
              description: 'Always kg-denominated plain English, regardless of the user\'s unit preference — for API consumers that don\'t do their own unit conversion. UI clients should build their own copy from reasonKey + reasonParams instead.',
            },
            reasonKey: {
              type: 'string',
              enum: ['weight_ready', 'weight_hold', 'weight_working', 'reps_ready', 'reps_ready_bodyweight', 'reps_hold', 'reps_working'],
              example: 'weight_ready',
              description: 'Which reason template applies — pair with reasonParams to render the sentence in the user\'s own lb/kg preference.',
            },
            reasonParams: {
              type: 'object',
              description: 'Raw numbers (weights in kg) behind `reason` / `reasonKey`, for unit-aware rendering.',
              properties: {
                currentWeightKg: { type: 'number', example: 83.9 },
                currentReps: { type: 'number', example: 10 },
                incrementKg: { type: 'number', nullable: true, example: 2.5 },
                consecutiveSessions: { type: 'integer', nullable: true, example: 3 },
                sessionsNeeded: { type: 'integer', nullable: true, example: 2 },
                repsThreshold: { type: 'integer', nullable: true, example: 10 },
                nextRepTarget: { type: 'integer', nullable: true, example: 12 },
              },
            },
            perSetSuggestions: {
              type: 'array',
              description: 'Per-set weight/reps targets for today — not the same flat number repeated on every set.',
              items: {
                type: 'object',
                properties: {
                  setNumber: { type: 'integer', example: 1 },
                  weightKg: { type: 'number', example: 80.5 },
                  reps: { type: 'integer', example: 8 },
                },
              },
            },
          },
        },
        ProgressionOverview: {
          type: 'object',
          properties: {
            ready: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProgressionSuggestion' },
            },
            inProgress: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProgressionSuggestion' },
            },
            total: { type: 'integer', example: 5 },
          },
        },
        ExerciseHistory: {
          type: 'object',
          properties: {
            sessionDate: { type: 'string', format: 'date-time' },
            weightKg: { type: 'number', example: 83.9 },
            totalReps: { type: 'integer', example: 30 },
            avgRepsPerSet: { type: 'number', example: 10.0 },
            sets: { type: 'integer', example: 3 },
          },
        },
        // ── Exercise Catalog ────────────────────────────────────────────────
        ExerciseCatalogEntry: {
          type: 'object',
          description: 'Structured facts about a known exercise. Not exhaustive — an exercise name with no matching row here isn\'t an error, it just falls back to keyword-based classification.',
          properties: {
            id: { type: 'string' },
            name: { type: 'string', example: 'Dumbbell Curl' },
            aliases: { type: 'array', items: { type: 'string' }, example: ['Dumbbell Bicep Curl', 'DB Curl', 'Bicep Curl'] },
            muscleGroup: { type: 'string', example: 'Biceps' },
            bodyRegion: { type: 'string', enum: ['UPPER', 'LOWER', 'FULL_BODY'] },
            movementPattern: { type: 'string', enum: ['COMPOUND', 'ISOLATION'] },
            equipment: { type: 'string', enum: ['BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'KETTLEBELL', 'BODYWEIGHT', 'BAND', 'OTHER'] },
            loadConvention: {
              type: 'string',
              enum: ['TOTAL', 'PER_SIDE', 'BODYWEIGHT', 'BODYWEIGHT_LOADABLE', 'TIME'],
              description: 'How to read the one weightKg number — TOTAL (whole load), PER_SIDE (what\'s held in each hand — not every dumbbell exercise, e.g. swings/goblet squats are TOTAL), BODYWEIGHT, BODYWEIGHT_LOADABLE, or TIME (duration-based, e.g. planks).',
            },
            progressionType: { type: 'string', enum: ['WEIGHT', 'REPS'], nullable: true },
          },
        },
        // ── Shared ──────────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
          },
        },
        MessageResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Deleted successfully' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/docs/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
