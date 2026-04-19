import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth";
import memberRoutes from "./routes/members";
import monthRoutes from "./routes/months";
import bookOptionRoutes from "./routes/bookOptions";
import dateOptionRoutes from "./routes/dateOptions";
import voteRoutes from "./routes/votes";
import metadataRoutes from "./routes/metadata";

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
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/months", monthRoutes);
app.use("/api/months", bookOptionRoutes); // /api/months/:monthKey/books
app.use("/api/months", dateOptionRoutes); // /api/months/:monthKey/dates
app.use("/api/months", voteRoutes); // /api/months/:monthKey/votes
app.use("/api/metadata", metadataRoutes); // /api/metadata/fetch

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Book Club API running on http://localhost:${PORT}`);
});

export default app;
