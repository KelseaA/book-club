import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

// Extend Express Request to carry the authenticated member
declare global {
  namespace Express {
    interface Request {
      memberId?: number;
    }
  }
}

/**
 * Reads the memberId from the signed session cookie and attaches it to req.
 * Returns 401 if no valid session is found.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const raw = req.cookies?.memberId;
  if (!raw) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // Verify member still exists
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) {
    return res.status(401).json({ error: "Session invalid" });
  }

  req.memberId = id;
  next();
}
