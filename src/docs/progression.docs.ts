/**
 * @swagger
 * tags:
 *   name: Progression
 *   description: Progressive overload suggestions based on workout history
 */

/**
 * @swagger
 * /api/progression:
 *   get:
 *     summary: Get progression suggestions for all recent exercises
 *     tags: [Progression]
 *     parameters:
 *       - in: query
 *         name: weeks
 *         schema:
 *           type: integer
 *           default: 6
 *         description: How many weeks back to look for exercises
 *     responses:
 *       200:
 *         description: Suggestions split into ready and in-progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ProgressionOverview'
 */

/**
 * @swagger
 * /api/progression/{exerciseName}:
 *   get:
 *     summary: Get a progression suggestion for a specific exercise
 *     tags: [Progression]
 *     parameters:
 *       - in: path
 *         name: exerciseName
 *         required: true
 *         schema:
 *           type: string
 *         example: Bench%20Press
 *         description: URL-encoded exercise name
 *     responses:
 *       200:
 *         description: Progression suggestion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ProgressionSuggestion'
 *       404:
 *         description: No history found for this exercise
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/progression/{exerciseName}/history:
 *   get:
 *     summary: Get raw session history for a specific exercise
 *     tags: [Progression]
 *     parameters:
 *       - in: path
 *         name: exerciseName
 *         required: true
 *         schema:
 *           type: string
 *         example: Bench%20Press
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of past sessions to return
 *     responses:
 *       200:
 *         description: Exercise history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExerciseHistory'
 */

export {};
