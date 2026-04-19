import { Router } from "express";
import {
  searchBooks,
  fetchBookDetail,
} from "../controllers/metadataController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/books-search", requireAuth, searchBooks);
router.get("/book-detail", requireAuth, fetchBookDetail);

export default router;
