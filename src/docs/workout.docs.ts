/**
 * @swagger
 * tags:
 *   name: Workouts
 *   description: Workout sessions, exercise logs and sets
 */

/**
 * @swagger
 * /api/workouts:
 *   post:
 *     summary: Create a workout session
 *     tags: [Workouts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Push Day
 *               notes:
 *                 type: string
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *
 *   get:
 *     summary: List all workout sessions (paginated)
 *     tags: [Workouts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WorkoutSession'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/workouts/{sessionId}:
 *   get:
 *     summary: Get a session with all exercises and sets
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update a session (name, notes, endedAt)
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               notes:
 *                 type: string
 *               endedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Session updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *
 *   delete:
 *     summary: Delete a session and all its exercises/sets
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */

/**
 * @swagger
 * /api/workouts/{sessionId}/exercises:
 *   post:
 *     summary: Add an exercise to a session
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exerciseName]
 *             properties:
 *               exerciseName:
 *                 type: string
 *                 example: Bench Press
 *               muscleGroup:
 *                 type: string
 *                 example: Chest
 *               orderIndex:
 *                 type: integer
 *                 example: 0
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exercise added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ExerciseLog'
 */

/**
 * @swagger
 * /api/workouts/{sessionId}/exercises/{exerciseLogId}/swap:
 *   post:
 *     summary: Swap an exercise for a random alternative in the same muscle group
 *     description: Only allowed before any sets have been logged for this exercise.
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseLogId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exercise swapped
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ExerciseLog'
 *       400:
 *         description: Exercise already has logged sets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found, or no alternatives available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/workouts/{sessionId}/exercises/{exerciseLogId}/sets:
 *   post:
 *     summary: Log a set for an exercise
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseLogId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [setNumber]
 *             properties:
 *               setNumber:
 *                 type: integer
 *                 example: 1
 *               weightKg:
 *                 type: number
 *                 example: 83.9
 *               reps:
 *                 type: integer
 *                 example: 10
 *               durationSecs:
 *                 type: integer
 *               rpe:
 *                 type: number
 *                 example: 8
 *               isWarmup:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Set logged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ExerciseSet'
 */

/**
 * @swagger
 * /api/workouts/{sessionId}/exercises/{exerciseLogId}/sets/{setId}:
 *   patch:
 *     summary: Update a set
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseLogId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weightKg:
 *                 type: number
 *               reps:
 *                 type: integer
 *               durationSecs:
 *                 type: integer
 *               rpe:
 *                 type: number
 *     responses:
 *       200:
 *         description: Set updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ExerciseSet'
 *
 *   delete:
 *     summary: Delete a set
 *     tags: [Workouts]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exerciseLogId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: setId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Set deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */

export {};
