import { Router } from "express";
import {
  addDate,
  updateDate,
  deleteDate,
  dateOptionSchema,
} from "../controllers/dateOptionController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/:meetingId/dates", validate(dateOptionSchema), addDate);
router.put("/:meetingId/dates/:dateId", validate(dateOptionSchema), updateDate);
router.delete("/:meetingId/dates/:dateId", deleteDate);

export default router;
