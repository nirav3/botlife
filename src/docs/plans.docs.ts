/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Official sample plans and user-created workout plans
 */

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: List plans visible to the user (official samples + your own)
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: List of plan summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *
 *   post:
 *     summary: Create a personal workout plan (always private to you)
 *     tags: [Plans]
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
 *                 example: My Custom Split
 *               description:
 *                 type: string
 *               difficulty:
 *                 type: string
 *                 example: Intermediate
 *               goal:
 *                 type: string
 *                 example: Hypertrophy
 *               daysPerWeek:
 *                 type: integer
 *               estimatedMinutes:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [dayNumber, label, sessionName, exercises]
 *                   properties:
 *                     dayNumber:
 *                       type: integer
 *                     label:
 *                       type: string
 *                     sessionName:
 *                       type: string
 *                     exercises:
 *                       type: array
 *                       items:
 *                         type: object
 *                         required: [name, muscleGroup, sets]
 *                         properties:
 *                           name:
 *                             type: string
 *                           muscleGroup:
 *                             type: string
 *                           notes:
 *                             type: string
 *                           sets:
 *                             type: array
 *                             items:
 *                               type: object
 *                               required: [setNumber, targetReps]
 *                               properties:
 *                                 setNumber:
 *                                   type: integer
 *                                 targetReps:
 *                                   type: string
 *                                   example: 8-12
 *                                 rpe:
 *                                   type: number
 *                                 isWarmup:
 *                                   type: boolean
 *     responses:
 *       201:
 *         description: Plan created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 */

/**
 * @swagger
 * /api/plans/{planId}:
 *   get:
 *     summary: Get a plan with all days and exercises
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       404:
 *         description: Not found, or not visible to this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update a plan you own (metadata and/or replace all days)
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Plan updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *       404:
 *         description: Not found, or not owned by this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   delete:
 *     summary: Delete a plan you own
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
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
 *       404:
 *         description: Not found, or not owned by this user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/plans/{planId}/start-day:
 *   post:
 *     summary: Start a plan day — creates a WorkoutSession pre-filled with its exercises
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayNumber]
 *             properties:
 *               dayNumber:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Workout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WorkoutSession'
 *       404:
 *         description: Plan or day not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
