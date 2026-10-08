import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { publicMember } from "./authController";
import { SALT_ROUNDS } from "../services/passwordReset";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { appUrl } from "../lib/tokens";
import { getOrCreateJoinLink, resetJoinLink } from "../services/joinLink";
import { parseId } from "../lib/params";
import {
  ACTIVE_MEMBER,
  deleteOwnAccount,
  grantAdmin,
  removeMember,
  restoreMember,
  stepDownAsAdmin,
} from "../services/admin";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // Password reset links go to this address, so changing it needs the password
  email: z.string().email().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function getProfile(req: Request, res: Response) {
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });
  return res.json(publicMember(member));
}

export async function updateProfile(req: Request, res: Response) {
  const {
    name,
    email,
    streetAddress,
    city,
    state,
    zipCode,
    country,
    currentPassword,
    newPassword,
  } = req.body;

  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });

  const changingEmail = email !== undefined && email !== member.email;
  if (newPassword || changingEmail) {
    if (!currentPassword) {
      return res.status(400).json({
        error: "Enter your current password to change your email or password",
      });
    }
    const match = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
  }
  if (changingEmail) {
    const taken = await prisma.member.findUnique({ where: { email } });
    if (taken) return res.status(409).json({ error: "Email already in use" });
  }

  const updated = await prisma.member.update({
    where: { id: req.memberId! },
    data: {
      name,
      email: changingEmail ? email : undefined,
      streetAddress,
      city,
      state,
      zipCode,
      country,
      // A new password signs out every other session (see lib/session.ts)
      ...(newPassword && {
        passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS),
        sessionVersion: { increment: 1 },
      }),
    },
  });

  // Keep this browser signed in with the new session version
  if (newPassword) setSessionCookie(res, updated);
  return res.json(publicMember(updated));
}

/** Active members (for the Members page and host picker), admins flagged */
export async function listMembers(_req: Request, res: Response) {
  const members = await prisma.member.findMany({
    where: ACTIVE_MEMBER,
    select: { id: true, name: true, isAdmin: true },
    orderBy: { name: "asc" },
  });
  return res.json(members);
}

/** Admin only: removed members, so a removal can be undone */
export async function listRemovedMembers(_req: Request, res: Response) {
  const members = await prisma.member.findMany({
    where: { removedAt: { not: null }, deletedAt: null },
    select: { id: true, name: true, removedAt: true },
    orderBy: { name: "asc" },
  });
  return res.json(members);
}

/** Sends a membership-change outcome from services/admin.ts as the response */
function respond(
  res: Response,
  outcome: { ok: true } | { status: number; error: string },
) {
  if ("error" in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  return res.json({ ok: true });
}

export async function removeMemberHandler(req: Request, res: Response) {
  const targetId = parseId(req.params.memberId);
  return respond(res, await removeMember(req.memberId!, targetId));
}

export async function restoreMemberHandler(req: Request, res: Response) {
  return respond(res, await restoreMember(parseId(req.params.memberId)));
}

export async function grantAdminHandler(req: Request, res: Response) {
  return respond(res, await grantAdmin(parseId(req.params.memberId)));
}

export async function stepDownHandler(req: Request, res: Response) {
  return respond(res, await stepDownAsAdmin(req.memberId!));
}

/**
 * Deletes the signed-in member's account: personal details are wiped and
 * they're signed out (see services/admin.ts deleteOwnAccount).
 */
export async function deleteAccount(req: Request, res: Response) {
  const outcome = await deleteOwnAccount(req.memberId!);
  if ("error" in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
}

/** GET /api/members/join-link — the club's current join link (created on first view) */
export async function getJoinLink(req: Request, res: Response) {
  const link = await getOrCreateJoinLink(req.memberId!);
  return res.json({ url: appUrl(`/join/${link.token}`) });
}

/** POST /api/members/join-link/reset — any member can replace a leaked link */
export async function resetJoinLinkHandler(req: Request, res: Response) {
  const link = await resetJoinLink(req.memberId!);
  return res.json({ url: appUrl(`/join/${link.token}`) });
}
