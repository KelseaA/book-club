import { Router } from "express";
import {
  getProfile,
  updateProfile,
  deleteAccount,
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
router.delete("/me", deleteAccount);

export default router;
