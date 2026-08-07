import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as queueController from "./queue.controller";

const router = Router();

router.get("/my", auth, requireRole(Roles.PATIENT), queueController.getMyQueueController);
router.get("/today", auth, requireRole(Roles.DOCTOR_ASSISTANT, Roles.DOCTOR), queueController.getTodayQueueController);
router.patch("/:id/call-next", auth, requireRole(Roles.DOCTOR_ASSISTANT), queueController.callNextController);
router.patch("/:id/status", auth, requireRole(Roles.DOCTOR_ASSISTANT), queueController.updateQueueStatusController);

export default router;
