import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as doctorController from "./doctor.controller";

const router = Router();

router.get("/me", auth, requireRole(Roles.DOCTOR), doctorController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.DOCTOR), doctorController.updateOwnProfileController);

export default router;