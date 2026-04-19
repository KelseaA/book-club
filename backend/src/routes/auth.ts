import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController";
import { registerSchema, loginSchema } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
