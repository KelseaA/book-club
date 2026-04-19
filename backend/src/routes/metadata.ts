import { Router } from "express";
import {
  fetchMetadata,
  fetchMetadataSchema,
  searchBooks,
  fetchBookDetail,
} from "../controllers/metadataController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post(
  "/fetch",
  requireAuth,
  validate(fetchMetadataSchema),
  fetchMetadata,
);
router.get("/books-search", requireAuth, searchBooks);
router.get("/book-detail", requireAuth, fetchBookDetail);

export default router;
