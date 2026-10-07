import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

/**
 * Last-resort error handler. Async errors reach here via express-async-errors.
 * Known Prisma constraint errors become 4xx responses; anything else is a 500.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint — e.g. a double-clicked vote submit racing past the
    // "already voted" check and hitting the one-ballot-per-member index
    if (err.code === "P2002") {
      return res.status(409).json({ error: "This has already been submitted" });
    }
    // Foreign key constraint — e.g. deleting an option that has votes
    if (err.code === "P2003") {
      return res
        .status(409)
        .json({ error: "This item is in use and can't be changed" });
    }
    // Serializable transaction conflict — e.g. two members starting the
    // next meeting at the same moment
    if (err.code === "P2034") {
      return res
        .status(409)
        .json({ error: "Someone else just did that — refresh and try again" });
    }
    // Record to update/delete not found
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Not found" });
    }
  }

  // Errors from Express itself (e.g. malformed JSON body) carry a 4xx status
  const status = (err as { status?: number })?.status;
  if (status && status >= 400 && status < 500) {
    return res.status(status).json({ error: "Invalid request" });
  }

  console.error("[error]", err);
  return res.status(500).json({ error: "Something went wrong" });
}
