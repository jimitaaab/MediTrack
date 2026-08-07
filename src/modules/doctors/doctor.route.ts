import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as doctorController from "./doctor.controller";

const router = Router();

router.get("/", doctorController.listDoctorsController);
router.get("/nearby", auth, requireRole(Roles.PATIENT), doctorController.getNearbyDoctorsController);
router.get("/me", auth, requireRole(Roles.DOCTOR), doctorController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.DOCTOR), doctorController.updateOwnProfileController);
router.get("/me/dashboard", auth, requireRole(Roles.DOCTOR), doctorController.getDashboardController);
router.get("/me/schedule", auth, requireRole(Roles.DOCTOR), doctorController.getOwnSchedulesController);
router.post("/me/schedule", auth, requireRole(Roles.DOCTOR), doctorController.createScheduleController);
router.patch("/me/schedule/:id", auth, requireRole(Roles.DOCTOR), doctorController.updateScheduleController);
router.delete("/me/schedule/:id", auth, requireRole(Roles.DOCTOR), doctorController.deleteScheduleController);
router.patch("/me/clinic-location", auth, requireRole(Roles.DOCTOR), doctorController.updateClinicLocationController);
router.get("/:id", doctorController.getPublicDoctorProfileController);
router.get("/:id/schedule", doctorController.getAvailableSlotsController);

export default router;