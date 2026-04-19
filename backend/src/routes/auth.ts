import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, logout, me } from "../controllers/authController";
import { registerSchema, loginSchema } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;
