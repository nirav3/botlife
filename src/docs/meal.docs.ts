/**
 * @swagger
 * tags:
 *   name: Meals
 *   description: Meal plans, meals and food item tracking with macro totals
 */

/**
 * @swagger
 * /api/meals:
 *   post:
 *     summary: Create a meal plan
 *     tags: [Meals]
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
 *                 example: Lean Bulk
 *               targetCalories:
 *                 type: integer
 *                 example: 2800
 *               targetProteinG:
 *                 type: integer
 *                 example: 200
 *               targetCarbsG:
 *                 type: integer
 *                 example: 300
 *               targetFatG:
 *                 type: integer
 *                 example: 80
 *     responses:
 *       201:
 *         description: Meal plan created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/MealPlan'
 *
 *   get:
 *     summary: List all meal plans
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: List of meal plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MealPlan'
 */

/**
 * @swagger
 * /api/meals/daily-summary:
 *   get:
 *     summary: Get today's macro totals vs plan targets
 *     tags: [Meals]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *           example: '2026-06-27'
 *         description: Date to summarise (defaults to today)
 *     responses:
 *       200:
 *         description: Daily nutrition summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/DailySummary'
 */

/**
 * @swagger
 * /api/meals/{planId}:
 *   get:
 *     summary: Get a meal plan with all meals and food items
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Meal plan detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/MealPlan'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   patch:
 *     summary: Update a meal plan
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: planId
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
 *               targetCalories:
 *                 type: integer
 *               targetProteinG:
 *                 type: integer
 *               targetCarbsG:
 *                 type: integer
 *               targetFatG:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plan updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/MealPlan'
 *
 *   delete:
 *     summary: Delete a meal plan
 *     tags: [Meals]
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
 */

/**
 * @swagger
 * /api/meals/{planId}/meals:
 *   post:
 *     summary: Add a meal to a plan
 *     tags: [Meals]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Breakfast
 *               loggedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Meal added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Meal'
 */

/**
 * @swagger
 * /api/meals/{planId}/meals/{mealId}/foods:
 *   post:
 *     summary: Add a food item to a meal
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, quantity, unit, calories]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Chicken Breast
 *               quantity:
 *                 type: number
 *                 example: 200
 *               unit:
 *                 type: string
 *                 example: g
 *               calories:
 *                 type: number
 *                 example: 330
 *               proteinG:
 *                 type: number
 *                 example: 62
 *               carbsG:
 *                 type: number
 *                 example: 0
 *               fatG:
 *                 type: number
 *                 example: 7
 *     responses:
 *       201:
 *         description: Food item added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/FoodItem'
 */

/**
 * @swagger
 * /api/meals/{planId}/meals/{mealId}/foods/{foodId}:
 *   delete:
 *     summary: Delete a food item
 *     tags: [Meals]
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mealId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: foodId
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

export {};
