import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as patientController from "./patient.controller";

const router = Router();

router.get("/me", auth, requireRole(Roles.PATIENT), patientController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.PATIENT), patientController.updateOwnProfile);
router.get("/me/dashboard", auth, requireRole(Roles.PATIENT), patientController.getDashboardController);

export default router;