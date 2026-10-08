import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { publicMember } from "./authController";
import { SALT_ROUNDS } from "../services/passwordReset";
import { setSessionCookie, clearSessionCookie } from "../lib/session";
import { appUrl } from "../lib/tokens";
import { getOrCreateJoinLink, resetJoinLink } from "../services/joinLink";

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

/** List all members (name + id only) for HostSelector and the Members page */
export async function listMembers(_req: Request, res: Response) {
  const members = await prisma.member.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(members);
}

/** Permanently delete the authenticated member's account */
export async function deleteAccount(req: Request, res: Response) {
  const memberId = req.memberId!;

  // Block if the member is host of a meeting that isn't finalized
  const activeHostedMeeting = await prisma.meeting.findFirst({
    where: { hostMemberId: memberId, status: { not: "FINALIZED" } },
    select: { id: true },
  });
  if (activeHostedMeeting) {
    return res.status(400).json({
      error:
        "You are the host of the meeting being planned. Transfer the host role before deleting your account.",
    });
  }

  // Delete votes, then the member, in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete book vote ranks first (child of BookVote)
    const bookVotes = await tx.bookVote.findMany({
      where: { memberId },
      select: { id: true },
    });
    const bookVoteIds = bookVotes.map((v) => v.id);
    await tx.bookVoteRank.deleteMany({
      where: { bookVoteId: { in: bookVoteIds } },
    });
    await tx.bookVote.deleteMany({ where: { memberId } });
    await tx.dateSelection.deleteMany({ where: { memberId } });
    await tx.member.delete({ where: { id: memberId } });
  });

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
