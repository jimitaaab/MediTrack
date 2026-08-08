import jwt from "jsonwebtoken";
import { prisma } from "./src/config/prisma";

const SECRET = "mysecretaccesskey";
const BASE = "http://localhost:5050/api";

function sign(id: string, email: string, role: string) {
  return jwt.sign({ email, id, role }, SECRET, { expiresIn: "1h" });
}

async function hit(path: string, token: string) {
  const res = await fetch(BASE + path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  return { path, status: res.status, body: text.slice(0, 2500) };
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const admin = users.find((u) => u.role === "ADMIN");
  const patient = users.find((u) => u.role === "PATIENT");
  const doctor = users.find((u) => u.role === "DOCTOR");
  const assistant = users.find((u) => u.role === "DOCTOR_ASSISTANT");

  const targets: Array<[string, string | undefined]> = [
    ["/admin/doctors", admin?.id],
    ["/admin/assistants", admin?.id],
    ["/patients/me/dashboard", patient?.id],
    ["/doctor/me/dashboard", doctor?.id],
    ["/assistant/me/dashboard", assistant?.id],
    ["/appointments/requests", assistant?.id],
  ];

  for (const [path, id] of targets) {
    if (!id) {
      console.log(`\nSKIP ${path} (no user)`);
      continue;
    }
    const role = path.startsWith("/admin")
      ? "ADMIN"
      : path.startsWith("/patients")
        ? "PATIENT"
        : path.startsWith("/doctor")
          ? "DOCTOR"
          : "DOCTOR_ASSISTANT";
    const u = users.find((x) => x.id === id)!;
    const token = sign(u.id, u.email, role);
    const r = await hit(path, token);
    console.log(`\n=== ${path} (${role}) -> ${r.status} ===`);
    console.log(r.body);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });