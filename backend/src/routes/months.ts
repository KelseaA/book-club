import { Router } from "express";
import {
  getOrCreateCurrentMonth,
  getMonthByKey,
  listMonths,
  setHost,
  openVoting,
  revealResults,
  finalizeMonth,
  setHostSchema,
  finalizeSchema,
} from "../controllers/monthController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// Archive listing
router.get("/", listMonths);

// Current month (auto-creates if missing)
router.get("/current", getOrCreateCurrentMonth);

// Specific month by YYYY-MM key
router.get("/:monthKey", getMonthByKey);

// Any authenticated member can set the host
router.put("/:monthKey/host", validate(setHostSchema), setHost);

// Host-only actions
router.post("/:monthKey/open-voting", openVoting);
router.post("/:monthKey/reveal", revealResults);
router.post("/:monthKey/finalize", validate(finalizeSchema), finalizeMonth);

export default router;
