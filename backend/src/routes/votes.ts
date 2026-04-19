import { Router } from "express";
import {
  submitBookVote,
  submitDateVote,
  getBookResults,
  getDateResults,
  getMyVoteStatus,
  submitBookVoteSchema,
  submitDateVoteSchema,
} from "../controllers/voteController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post(
  "/:monthKey/votes/books",
  validate(submitBookVoteSchema),
  submitBookVote,
);
router.post(
  "/:monthKey/votes/dates",
  validate(submitDateVoteSchema),
  submitDateVote,
);
router.get("/:monthKey/votes/me", getMyVoteStatus);
router.get("/:monthKey/results/books", getBookResults);
router.get("/:monthKey/results/dates", getDateResults);

export default router;
