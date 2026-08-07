import { Router } from "express";
import auth from "../../middleware/auth.middleware";
import * as authController from "./auth.controller";
import {
  validateChangePassword,
  validateForgotPassword,
  validateLogin,
  validateRegisterDoctor,
  validateRegisterPatient,
  validateResetPassword,
} from "./auth.validation";

const router = Router();

router.post(
  "/register/patient",
  validateRegisterPatient,
  authController.registerPatientController,
);
router.post(
  "/register/doctor",
  validateRegisterDoctor,
  authController.registerDoctorController,
);
router.post("/login", validateLogin, authController.loginController);
router.post("/refresh-token", authController.refreshTokenController);
router.post("/logout", auth, authController.logoutController);
router.post(
  "/change-password",
  auth,
  validateChangePassword,
  authController.changePasswordController,
);
router.post(
  "/forgot-password",
  validateForgotPassword,
  authController.forgotPasswordController,
);
router.post(
  "/reset-password",
  validateResetPassword,
  authController.resetPasswordController,
);

export default router;