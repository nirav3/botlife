/**
 * @swagger
 * tags:
 *   name: Exercises
 *   description: Exercise catalog — structured facts (equipment, body region, progression type) used to classify known exercises instead of guessing from the free-text name
 */

/**
 * @swagger
 * /api/exercises/catalog:
 *   get:
 *     summary: Get the full exercise catalog
 *     tags: [Exercises]
 *     responses:
 *       200:
 *         description: All known exercises. Small and effectively static — fetch once and cache client-side.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExerciseCatalogEntry'
 */

export {};
