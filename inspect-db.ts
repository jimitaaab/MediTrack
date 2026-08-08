import { prisma } from "./src/config/prisma";

async function main() {
  const [doctors, assistants, patients, users] = await Promise.all([
    prisma.doctor.count(),
    prisma.doctorAssistant.count(),
    prisma.patient.count(),
    prisma.user.count(),
  ]);
  console.log("doctors=", doctors, "assistants=", assistants, "patients=", patients, "users=", users);

  const ds = await prisma.doctor.findMany({
    take: 10,
    include: {
      user: { select: { id: true, fullName: true, email: true, status: true } },
      specialization: true,
    },
  });
  console.log(JSON.stringify(ds, null, 2));

  const as = await prisma.doctorAssistant.findMany({
    take: 5,
    include: {
      user: { select: { id: true, fullName: true, email: true, status: true } },
      doctor: { select: { id: true, user: { select: { fullName: true } } } },
    },
  });
  console.log("ASSISTANTS:", JSON.stringify(as, null, 2));

  const appts = await prisma.appointment.findMany({ take: 5 });
  console.log("APPOINTMENTS:", JSON.stringify(appts, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });