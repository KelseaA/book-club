import { Router } from "express";
import {
  submitVote,
  getBookResults,
  getDateResults,
  getMyVoteStatus,
  submitVoteSchema,
} from "../controllers/voteController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/:meetingId/votes", validate(submitVoteSchema), submitVote);
router.get("/:meetingId/votes/me", getMyVoteStatus);
router.get("/:meetingId/results/books", getBookResults);
router.get("/:meetingId/results/dates", getDateResults);

export default router;
