import { Router } from "express";
import {
  getProfile,
  updateProfile,
  deleteAccount,
  listMembers,
  listRemovedMembers,
  removeMemberHandler,
  restoreMemberHandler,
  grantAdminHandler,
  stepDownHandler,
  getJoinLink,
  resetJoinLinkHandler,
  updateProfileSchema,
} from "../controllers/memberController";
import { validate } from "../middleware/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", listMembers);
router.get("/me", getProfile);
router.put("/me", validate(updateProfileSchema), updateProfile);
router.delete("/me", deleteAccount);
// Any admin can step down, as long as another admin remains
router.post("/me/step-down", stepDownHandler);

// Any member can view or reset the join link (so a leak can be shut fast)
router.get("/join-link", getJoinLink);
router.post("/join-link/reset", resetJoinLinkHandler);

// Admin only
router.get("/removed", requireAdmin, listRemovedMembers);
router.post("/:memberId/remove", requireAdmin, removeMemberHandler);
router.post("/:memberId/restore", requireAdmin, restoreMemberHandler);
router.post("/:memberId/admin", requireAdmin, grantAdminHandler);

export default router;
