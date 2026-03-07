import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const foods = [
  {
    name: "Chicken Breast",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    fiber: 0,
    isVerified: true,
  },
  {
    name: "Brown Rice",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 112,
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
    fiber: 1.8,
    isVerified: true,
  },
  {
    name: "Broccoli",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fat: 0.4,
    fiber: 2.6,
    isVerified: true,
  },
  {
    name: "Salmon Fillet",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
    fiber: 0,
    isVerified: true,
  },
  {
    name: "Greek Yogurt",
    brand: "Fage",
    servingSize: 170,
    servingUnit: "g",
    calories: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    fiber: 0,
    isVerified: true,
  },
  {
    name: "Almonds",
    brand: null,
    servingSize: 28,
    servingUnit: "g",
    calories: 164,
    protein: 6,
    carbs: 6,
    fat: 14,
    fiber: 3.5,
    isVerified: true,
  },
  {
    name: "Banana",
    brand: null,
    servingSize: 118,
    servingUnit: "g",
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
    fiber: 3.1,
    isVerified: true,
  },
  {
    name: "Egg",
    brand: null,
    servingSize: 50,
    servingUnit: "g",
    calories: 78,
    protein: 6,
    carbs: 0.6,
    fat: 5,
    fiber: 0,
    isVerified: true,
  },
  {
    name: "Oatmeal",
    brand: "Quaker",
    servingSize: 40,
    servingUnit: "g",
    calories: 150,
    protein: 5,
    carbs: 27,
    fat: 3,
    fiber: 4,
    isVerified: true,
  },
  {
    name: "Sweet Potato",
    brand: null,
    servingSize: 130,
    servingUnit: "g",
    calories: 112,
    protein: 2,
    carbs: 26,
    fat: 0.1,
    fiber: 3.9,
    isVerified: true,
  },
  {
    name: "Avocado",
    brand: null,
    servingSize: 150,
    servingUnit: "g",
    calories: 240,
    protein: 3,
    carbs: 13,
    fat: 22,
    fiber: 10,
    isVerified: true,
  },
  {
    name: "Spinach",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    fiber: 2.2,
    isVerified: true,
  },
  {
    name: "Whole Wheat Bread",
    brand: null,
    servingSize: 28,
    servingUnit: "g",
    calories: 69,
    protein: 3.6,
    carbs: 12,
    fat: 1.1,
    fiber: 1.9,
    isVerified: true,
  },
  {
    name: "Cottage Cheese",
    brand: null,
    servingSize: 113,
    servingUnit: "g",
    calories: 98,
    protein: 11,
    carbs: 3.4,
    fat: 4.3,
    fiber: 0,
    isVerified: true,
  },
  {
    name: "Quinoa",
    brand: null,
    servingSize: 100,
    servingUnit: "g",
    calories: 120,
    protein: 4.4,
    carbs: 21,
    fat: 1.9,
    fiber: 2.8,
    isVerified: true,
  },
];

async function main() {
  console.log("Seeding database...");

  // Create foods
  for (const food of foods) {
    await prisma.food.upsert({
      where: {
        id: food.name.toLowerCase().replace(/\s+/g, "-"),
      },
      update: food,
      create: {
        id: food.name.toLowerCase().replace(/\s+/g, "-"),
        ...food,
      },
    });
  }

  console.log(`Seeded ${foods.length} foods`);

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@example.com",
      name: "Demo User",
      emailVerified: true,
    },
  });

  // Create user profile
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      gender: "MALE",
      height: 175,
      weight: 75,
      activityLevel: "MODERATE",
      targetCalories: 2000,
      targetProtein: 150,
      targetCarbs: 200,
      targetFat: 65,
    },
  });

  console.log("Created demo user with profile");
  console.log("Database seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
