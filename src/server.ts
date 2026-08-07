import app from "./app";
import { prisma } from "./config/prisma";
import config from "./config/env";
// TODO: re-add once the notification module is rebuilt
// import { startScheduler } from "./modules/notifications/notification.scheduler";

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected to the database");
    // TODO: re-add once the notification module is rebuilt
    // startScheduler();
    app.listen(config.PORT, () => {
      console.log(`Server is running on port ${config.PORT}`);
    });
  } catch (error) {
    console.log("Error starting the server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
