import { Router } from "express";
import {
  getProfile,
  updateProfile,
  listMembers,
  updateProfileSchema,
} from "../controllers/memberController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listMembers);
router.get("/me", getProfile);
router.put("/me", validate(updateProfileSchema), updateProfile);

export default router;
