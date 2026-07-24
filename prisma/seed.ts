import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@botlife.app' },
    update: {},
    create: {
      email: 'demo@botlife.app',
      passwordHash,
      name: 'Demo User',
    },
  });

  console.log(`✅ Created user: ${user.email}`);

  // Seed weight entries
  const today = new Date();
  const weightData = [90.5, 90.2, 89.8, 89.5, 89.0, 88.7, 88.5];
  for (let i = weightData.length - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    await prisma.weightEntry.create({
      data: { userId: user.id, weightKg: weightData[i], loggedAt: date },
    });
  }
  console.log('✅ Seeded weight entries');

  // Seed workout sessions (bench press progression example)
  const benchWeights = [
    { kg: 83.9, reps: 10 },  // week 1  (185lbs)
    { kg: 83.9, reps: 10 },  // week 2
    { kg: 83.9, reps: 11 },  // week 3
    { kg: 86.2, reps: 9 },   // week 4  (190lbs)
  ];

  for (let i = 0; i < benchWeights.length; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (benchWeights.length - 1 - i) * 7);

    const session = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        name: 'Push Day',
        startedAt: date,
        endedAt: new Date(date.getTime() + 60 * 60 * 1000),
      },
    });

    const log = await prisma.exerciseLog.create({
      data: {
        workoutSessionId: session.id,
        exerciseName: 'Bench Press',
        muscleGroup: 'Chest',
        orderIndex: 0,
      },
    });

    for (let s = 1; s <= 3; s++) {
      await prisma.exerciseSet.create({
        data: {
          exerciseLogId: log.id,
          setNumber: s,
          weightKg: benchWeights[i].kg,
          reps: benchWeights[i].reps,
          isWarmup: false,
        },
      });
    }
  }
  console.log('✅ Seeded workout sessions');

  // Seed meal plan
  const plan = await prisma.mealPlan.create({
    data: {
      userId: user.id,
      name: 'Lean Bulk',
      targetCalories: 2800,
      targetProteinG: 200,
      targetCarbsG: 300,
      targetFatG: 80,
      isActive: true,
    },
  });

  const breakfast = await prisma.meal.create({
    data: { mealPlanId: plan.id, name: 'Breakfast' },
  });

  await prisma.foodItem.createMany({
    data: [
      { mealId: breakfast.id, name: 'Oats', quantity: 100, unit: 'g', calories: 389, proteinG: 17, carbsG: 66, fatG: 7 },
      { mealId: breakfast.id, name: 'Whole Eggs', quantity: 3, unit: 'large', calories: 210, proteinG: 18, carbsG: 2, fatG: 15 },
    ],
  });

  console.log('✅ Seeded meal plan');
  console.log('\n🎉 Seed complete! Login with: demo@botlife.app / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
