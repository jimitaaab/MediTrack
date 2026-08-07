import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import requireRole from "../../middleware/role.middleware";
import { Roles } from "../../shared/constants";
import * as aiController from "./ai.controller";

const router = Router();

router.post("/ask", auth, requireRole(Roles.PATIENT), aiController.askChatbotController);
router.get("/history", auth, requireRole(Roles.PATIENT), aiController.getChatbotHistoryController);

export default router;
