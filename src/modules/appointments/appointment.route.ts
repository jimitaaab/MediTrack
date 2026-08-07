import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as appointmentController from "./appointment.controller";

const router = Router();

router.post("/", auth, requireRole(Roles.PATIENT), appointmentController.bookAppointmentController);
router.get("/requests", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.getPendingRequestsController);
router.patch("/requests/:id/accept", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.acceptRequestController);
router.patch("/requests/:id/reject", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.rejectRequestController);
router.get("/my", auth, requireRole(Roles.PATIENT), appointmentController.getMyAppointmentsController);
router.get("/", auth, requireRole(Roles.DOCTOR_ASSISTANT, Roles.ADMIN), appointmentController.getAllAppointmentsController);
router.get("/:id", auth, requireRole(Roles.PATIENT, Roles.DOCTOR, Roles.DOCTOR_ASSISTANT), appointmentController.getAppointmentByIdController);
router.patch("/:id/cancel", auth, requireRole(Roles.PATIENT), appointmentController.cancelAppointmentController);
router.patch("/:id/reschedule", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.rescheduleAppointmentController);
router.patch("/:id/cancel-by-staff", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.cancelByStaffController);
router.patch("/:id/status", auth, requireRole(Roles.DOCTOR_ASSISTANT), appointmentController.updateAppointmentStatusController);

export default router;
