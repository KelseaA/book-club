import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { isValidJoinToken } from "../services/joinLink";
import {
  SALT_ROUNDS,
  createResetLink,
  resetPasswordWithToken,
} from "../services/passwordReset";
import { sendPasswordResetEmail } from "../lib/mailer";

export const registerSchema = z.object({
  // The club's join link token — registration is invite-only
  joinToken: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function register(req: Request, res: Response) {
  const {
    joinToken,
    name,
    email,
    password,
    streetAddress,
    city,
    state,
    zipCode,
    country,
  } = req.body;

  if (!(await isValidJoinToken(prisma, joinToken))) {
    return res.status(403).json({
      error:
        "This invite link isn't valid anymore. Ask a member for the current one.",
    });
  }

  const existing = await prisma.member.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const member = await prisma.member.create({
    data: {
      name,
      email,
      passwordHash,
      streetAddress,
      city,
      state,
      zipCode,
      country,
    },
  });

  setSessionCookie(res, member);
  return res.status(201).json(publicMember(member));
}

/** GET /api/auth/join/:token — lets the join page say up front if a link is dead */
export async function checkJoinLink(req: Request, res: Response) {
  return res.json({ valid: await isValidJoinToken(prisma, req.params.token) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, member.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  setSessionCookie(res, member);
  return res.json(publicMember(member));
}

export async function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });
  return res.json(publicMember(member));
}

/**
 * POST /api/auth/forgot-password — emails a one-time reset link. Always
 * responds the same way, so it can't be used to find out who's a member.
 */
export async function forgotPassword(req: Request, res: Response) {
  const member = await prisma.member.findUnique({
    where: { email: req.body.email },
  });
  if (member) {
    const link = await createResetLink(member.id);
    // Fire-and-forget so response timing doesn't reveal whether it sent
    sendPasswordResetEmail({ to: member.email, name: member.name, link }).catch(
      (err) => console.error("[mailer] Failed to send reset email:", err),
    );
  }
  return res.json({ ok: true });
}

/** POST /api/auth/reset-password — sets a new password and signs the member in */
export async function resetPassword(req: Request, res: Response) {
  const member = await resetPasswordWithToken(
    req.body.token,
    req.body.password,
  );
  if (!member) {
    return res.status(400).json({
      error:
        "This reset link has expired or was already used. Request a new one.",
    });
  }
  // Their sessionVersion just changed, so issue a fresh cookie for this browser
  setSessionCookie(res, member);
  return res.json(publicMember(member));
}

/** Strip secrets before sending to client */
export function publicMember<
  M extends { passwordHash: string; sessionVersion: number },
>(m: M) {
  const { passwordHash: _pw, sessionVersion: _sv, ...safe } = m;
  return safe;
}
