import { Router } from "express";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  getJoinLink,
  resetJoinLinkHandler,
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
router.get("/join-link", getJoinLink);
router.post("/join-link/reset", resetJoinLinkHandler);

export default router;
