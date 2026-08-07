import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import patientRouter from "../modules/patients/patient.route";
import doctorRouter from "../modules/doctors/doctor.route";
import assistantRouter from "../modules/assistant/assistant.route";
import adminRouter from "../modules/admin/admin.routes";
import specializationRouter from "../modules/specializations/specialization.route";
import appointmentRouter from "../modules/appointments/appointment.route";
import queueRouter from "../modules/queue/queue.route";
import reviewRouter from "../modules/reviews/review.route";
import notificationRouter from "../modules/notifications/notification.route";
import aiRouter from "../modules/ai/ai.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/patients", patientRouter);
router.use("/doctor", doctorRouter);
router.use("/assistant", assistantRouter);
router.use("/admin", adminRouter);
router.use("/specializations", specializationRouter);
router.use("/appointments", appointmentRouter);
router.use("/queue", queueRouter);
router.use("/reviews", reviewRouter);
router.use("/notifications", notificationRouter);
router.use("/chatbot", aiRouter);

export default router;