import { Router } from "express";
import authRouter from "../modules/auth/auth.routes";
import patientRouter from "../modules/patients/patient.route";
import doctorRouter from "../modules/doctors/doctor.route";
import assistantRouter from "../modules/assistant/assistant.route";
import adminRouter from "../modules/admin/admin.routes";

const router = Router();

router.use("/auth", authRouter);
router.use("/patients", patientRouter);
router.use("/doctor", doctorRouter);
router.use("/assistant", assistantRouter);
router.use("/admin", adminRouter);

export default router;