/**
 * @swagger
 * tags:
 *   name: Weight
 *   description: Log and track body weight over time
 */

/**
 * @swagger
 * /api/weight:
 *   post:
 *     summary: Log a weight entry
 *     tags: [Weight]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [weightKg]
 *             properties:
 *               weightKg:
 *                 type: number
 *                 example: 83.5
 *               note:
 *                 type: string
 *                 example: Morning, after workout
 *               loggedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Entry created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WeightEntry'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   get:
 *     summary: Get weight history (paginated)
 *     tags: [Weight]
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
 *           default: 30
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter entries from this date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter entries up to this date
 *     responses:
 *       200:
 *         description: List of weight entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WeightEntry'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/weight/stats:
 *   get:
 *     summary: Get weight statistics (current, min, max, trend)
 *     tags: [Weight]
 *     responses:
 *       200:
 *         description: Weight statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/WeightStats'
 */

/**
 * @swagger
 * /api/weight/{id}:
 *   delete:
 *     summary: Delete a weight entry
 *     tags: [Weight]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Entry deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Entry not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

export {};
