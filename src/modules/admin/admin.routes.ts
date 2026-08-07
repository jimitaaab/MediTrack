import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as adminController from "./admin.controller";

const router = Router();

router.get("/me", auth, requireRole(Roles.ADMIN), adminController.getOwnProfileController);
router.patch("/me", auth, requireRole(Roles.ADMIN), adminController.updateOwnProfileController);

export default router;