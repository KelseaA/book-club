import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  submitFeedback,
  feedbackSchema,
} from "../controllers/feedbackController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: "Too many feedback submissions. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAuth);
router.post("/", feedbackLimiter, validate(feedbackSchema), submitFeedback);

export default router;
