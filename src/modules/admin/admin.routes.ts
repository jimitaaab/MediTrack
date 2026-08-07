import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as adminController from "./admin.controller";

const router = Router();

router.get("/dashboard", auth, requireRole(Roles.ADMIN), adminController.getDashboardStatsController);
router.get("/reports", auth, requireRole(Roles.ADMIN), adminController.getReportsController);
router.get("/me", auth, requireRole(Roles.ADMIN), adminController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.ADMIN), adminController.updateOwnProfileController);
router.get("/doctors/pending", auth, requireRole(Roles.ADMIN), adminController.getPendingDoctorsController);
router.patch("/doctors/:id/approve", auth, requireRole(Roles.ADMIN), adminController.approveDoctorController);
router.patch("/doctors/:id/reject", auth, requireRole(Roles.ADMIN), adminController.rejectDoctorController);
router.patch("/doctors/:id/suspend", auth, requireRole(Roles.ADMIN), adminController.suspendDoctorController);

export default router;