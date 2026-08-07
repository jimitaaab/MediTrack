import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import config from "../src/config/env";

const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const specializations = [
    { name: "Cardiology", icon: "💓" },
    { name: "Dermatology", icon: "🧴" },
    { name: "Neurology", icon: "🧠" },
    { name: "Pediatrics", icon: "👶" },
    { name: "General Medicine", icon: "🩺" },
    { name: "Orthopedic", icon: "🦴" },
  ];

  for (const spec of specializations) {
    await prisma.specialization.upsert({
      where: { name: spec.name },
      update: {},
      create: spec,
    });
    console.log(`Seeded specialization: ${spec.name}`);
  }

  const adminEmail = "admin@meditrack.com";
  const password = await bcrypt.hash("Admin@123", Number(config.bcryptSaltRounds));

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: "System Admin",
      email: adminEmail,
      password,
      role: "ADMIN",
      status: "ACTIVE",
      admin: { create: {} },
    },
  });
  console.log(`Seeded admin: ${adminEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());