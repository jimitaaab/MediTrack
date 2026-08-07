import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as assistantController from "./assistant.controller";

const router = Router();

router.get("/me", auth, requireRole(Roles.DOCTOR_ASSISTANT), assistantController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.DOCTOR_ASSISTANT), assistantController.updateOwnProfileController);
router.get("/me/dashboard", auth, requireRole(Roles.DOCTOR_ASSISTANT), assistantController.getDashboardController);

export default router;