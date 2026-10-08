import { Response } from "express";

/**
 * Login cookie. Its signed value is "<memberId>.<sessionVersion>"; requireAuth
 * rejects it once the member's sessionVersion has moved on (e.g. after a
 * password reset), which signs that member out everywhere.
 */
export const SESSION_COOKIE = "session";

// httpOnly prevents JS access, signed prevents tampering
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  signed: true,
};

export function setSessionCookie(
  res: Response,
  member: { id: number; sessionVersion: number },
) {
  res.cookie(
    SESSION_COOKIE,
    `${member.id}.${member.sessionVersion}`,
    cookieOptions,
  );
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
}

/** Returns null for missing, tampered (signed cookie → false) or malformed values */
export function parseSessionCookie(
  raw: unknown,
): { memberId: number; sessionVersion: number } | null {
  if (typeof raw !== "string") return null;
  const match = /^(\d+)\.(\d+)$/.exec(raw);
  if (!match) return null;
  return { memberId: Number(match[1]), sessionVersion: Number(match[2]) };
}
