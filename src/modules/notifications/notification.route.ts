import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import * as notificationController from "./notification.controller";

const router = Router();

router.get("/", auth, notificationController.getNotificationsController);
router.patch("/read-all", auth, notificationController.markAllAsReadController);
router.patch("/:id/read", auth, notificationController.markAsReadController);
router.delete("/:id", auth, notificationController.deleteNotificationController);

export default router;
