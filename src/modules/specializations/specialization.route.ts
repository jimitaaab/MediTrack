import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as specializationController from "./specialization.controller";

const router = Router();

router.get("/", specializationController.listSpecializationsController);
router.post(
  "/",
  auth,
  requireRole(Roles.ADMIN),
  specializationController.createSpecializationController,
);
router.patch(
  "/:id",
  auth,
  requireRole(Roles.ADMIN),
  specializationController.updateSpecializationController,
);
router.delete(
  "/:id",
  auth,
  requireRole(Roles.ADMIN),
  specializationController.deleteSpecializationController,
);

export default router;
