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

router.post("/:monthKey/dates", validate(dateOptionSchema), addDate);
router.put("/:monthKey/dates/:dateId", validate(dateOptionSchema), updateDate);
router.delete("/:monthKey/dates/:dateId", deleteDate);

export default router;
