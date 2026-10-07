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

router.post("/:monthKey/votes", validate(submitVoteSchema), submitVote);
router.get("/:monthKey/votes/me", getMyVoteStatus);
router.get("/:monthKey/results/books", getBookResults);
router.get("/:monthKey/results/dates", getDateResults);

export default router;
