import express from "express";
// Patches Express 4 so errors thrown in async handlers reach errorHandler
import "express-async-errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth";
import memberRoutes from "./routes/members";
import meetingRoutes from "./routes/meetings";
import bookOptionRoutes from "./routes/bookOptions";
import dateOptionRoutes from "./routes/dateOptions";
import voteRoutes from "./routes/votes";
import metadataRoutes from "./routes/metadata";
import feedbackRoutes from "./routes/feedback";
import { errorHandler } from "./middleware/errorHandler";

if (!process.env.SESSION_SECRET) {
  console.error(
    "[startup] SESSION_SECRET env var is not set. Signed cookies are insecure. Refusing to start.",
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true, // required for httpOnly cookie auth
  }),
);
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/meetings", bookOptionRoutes); // /api/meetings/:meetingId/books
app.use("/api/meetings", dateOptionRoutes); // /api/meetings/:meetingId/dates
app.use("/api/meetings", voteRoutes); // /api/meetings/:meetingId/votes
app.use("/api/metadata", metadataRoutes); // Open Library book search
app.use("/api/feedback", feedbackRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Public: the address notification emails come from, so the sign-up and
// profile pages can tell people to add it to their contacts (it's in every
// email anyway). null when email isn't configured.
app.get("/api/config", (_req, res) =>
  res.json({ emailSender: process.env.GMAIL_USER || null }),
);

// Must be registered after all routes
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Book Club API running on http://localhost:${PORT}`);
});

export default app;
