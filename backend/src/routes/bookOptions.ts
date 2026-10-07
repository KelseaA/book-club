import { Router } from "express";
import {
  addBook,
  updateBook,
  deleteBook,
  bookOptionSchema,
} from "../controllers/bookOptionController";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.post("/:meetingId/books", validate(bookOptionSchema), addBook);
router.put("/:meetingId/books/:bookId", validate(bookOptionSchema), updateBook);
router.delete("/:meetingId/books/:bookId", deleteBook);

export default router;
