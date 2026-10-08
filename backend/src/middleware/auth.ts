import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { SESSION_COOKIE, parseSessionCookie } from "../lib/session";

// Extend Express Request to carry the authenticated member
declare global {
  namespace Express {
    interface Request {
      memberId?: number;
    }
  }
}

/**
 * Reads the member from the signed session cookie and attaches it to req.
 * Returns 401 if there's no valid session — including when the member's
 * sessionVersion has changed since the cookie was issued (password reset).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = parseSessionCookie(req.signedCookies?.[SESSION_COOKIE]);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: { sessionVersion: true, removedAt: true, deletedAt: true },
  });
  if (
    !member ||
    member.sessionVersion !== session.sessionVersion ||
    member.removedAt ||
    member.deletedAt
  ) {
    return res.status(401).json({ error: "Session expired — please sign in" });
  }

  req.memberId = session.memberId;
  next();
}

/**
 * Use after requireAuth. Checks the admin flag fresh from the database on
 * every request, so losing the role takes effect immediately.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
    select: { isAdmin: true },
  });
  if (!member?.isAdmin) {
    return res.status(403).json({ error: "Only admins can do that" });
  }
  next();
}
