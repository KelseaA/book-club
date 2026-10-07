import { Router } from "express";
import {
  getCurrentMeetings,
  createMeeting,
  getMeeting,
  listMeetings,
  setHost,
  openVoting,
  revealResults,
  finalizeMeeting,
  setHostSchema,
  finalizeSchema,
} from "../controllers/meetingController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Archive listing (finalized meetings)
router.get("/", listMeetings);

// Dashboard: upcoming finalized meeting + the one being planned
router.get("/current", getCurrentMeetings);

// Any member can start planning the next meeting
router.post("/", createMeeting);

router.get("/:meetingId", getMeeting);

// Any authenticated member can set the host
router.put("/:meetingId/host", validate(setHostSchema), setHost);

// Host-only actions
router.post("/:meetingId/open-voting", openVoting);
router.post("/:meetingId/reveal", revealResults);
router.post("/:meetingId/finalize", validate(finalizeSchema), finalizeMeeting);

export default router;
