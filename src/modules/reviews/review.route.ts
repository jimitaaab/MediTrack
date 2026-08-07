import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as reviewController from "./review.controller";

const router = Router();

router.post("/", auth, requireRole(Roles.PATIENT), reviewController.createReviewController);
router.get("/my", auth, requireRole(Roles.PATIENT), reviewController.getMyReviewsController);
router.get("/", auth, requireRole(Roles.ADMIN), reviewController.getAllReviewsController);
router.patch("/:id", auth, requireRole(Roles.PATIENT), reviewController.updateReviewController);
router.delete("/:id", auth, requireRole(Roles.PATIENT, Roles.ADMIN), reviewController.deleteReviewController);

export default router;
