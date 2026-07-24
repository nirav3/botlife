import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BotLife API',
      version: '1.0.0',
      description:
        'REST API for the BotLife lifestyle tracking app — gym workouts, progressive overload, weight tracking, and meal plans.',
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
            currentWeightKg: { type: 'number', example: 83.9 },
            suggestedWeightKg: { type: 'number', example: 86.4 },
            currentReps: { type: 'integer', example: 10 },
            suggestedReps: { type: 'integer', nullable: true, example: 8 },
            readyForProgression: { type: 'boolean', example: true },
            reason: {
              type: 'string',
              example: "You've hit 3 sessions at 83.9kg averaging 10 reps. Time to increase by 2.5kg!",
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
