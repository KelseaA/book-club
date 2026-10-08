import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { randomToken } from "../lib/tokens";

type Tx = Prisma.TransactionClient;
type Outcome = { ok: true } | { status: number; error: string };

/** Members who can sign in and show up in lists */
export const ACTIVE_MEMBER = { removedAt: null, deletedAt: null } as const;

/**
 * Runs a membership change in a serializable transaction. The "at least one
 * admin" rule is a check-then-write, so without this two admins stepping
 * down at the same moment could both pass the check and leave none. A
 * conflicting transaction fails with P2034, which errorHandler turns into 409.
 */
function serializable(fn: (tx: Tx) => Promise<Outcome>) {
  return prisma.$transaction(fn, { isolationLevel: "Serializable" });
}

async function otherActiveAdminCount(tx: Tx, memberId: number) {
  return tx.member.count({
    where: { ...ACTIVE_MEMBER, isAdmin: true, id: { not: memberId } },
  });
}

/**
 * A member leaving mid-round shouldn't sway it, so drop their vote in any
 * meeting that isn't finalized. Votes in finalized meetings stay, so archive
 * rankings never change after the fact.
 */
async function discardOpenVotes(tx: Tx, memberId: number) {
  const open = { status: { not: "FINALIZED" as const } };
  await tx.bookVoteRank.deleteMany({
    where: { bookVote: { memberId, meeting: open } },
  });
  await tx.bookVote.deleteMany({ where: { memberId, meeting: open } });
  await tx.dateSelection.deleteMany({
    where: { memberId, dateOption: { meeting: open } },
  });
}

/** Someone hosting the meeting being planned has to hand it off first */
async function hostsOpenMeeting(tx: Tx, memberId: number) {
  const meeting = await tx.meeting.findFirst({
    where: { hostMemberId: memberId, status: { not: "FINALIZED" } },
    select: { id: true },
  });
  return !!meeting;
}

/**
 * Admin removes a member: they're signed out everywhere (sessionVersion
 * bump), can't sign in again, and disappear from lists. History stays.
 */
export function removeMember(adminId: number, targetId: number) {
  return serializable(async (tx) => {
    if (adminId === targetId) {
      return {
        status: 400,
        error: "To leave, step down as admin or delete your account instead",
      };
    }
    const target = await tx.member.findFirst({
      where: { id: targetId, ...ACTIVE_MEMBER },
    });
    if (!target) return { status: 404, error: "Member not found" };
    if (target.isAdmin && (await otherActiveAdminCount(tx, targetId)) === 0) {
      return { status: 400, error: "The club needs at least one admin" };
    }
    if (await hostsOpenMeeting(tx, targetId)) {
      return {
        status: 400,
        error: `${target.name} is hosting the meeting being planned. Change the host first.`,
      };
    }
    await discardOpenVotes(tx, targetId);
    await tx.member.update({
      where: { id: targetId },
      data: {
        removedAt: new Date(),
        isAdmin: false,
        sessionVersion: { increment: 1 },
      },
    });
    // Outstanding reset links would otherwise still work after removal
    await tx.passwordResetToken.deleteMany({ where: { memberId: targetId } });
    return { ok: true };
  });
}

/** Admin undoes a removal. They come back as a regular member. */
export function restoreMember(targetId: number) {
  return serializable(async (tx) => {
    const target = await tx.member.findFirst({
      where: { id: targetId, removedAt: { not: null }, deletedAt: null },
    });
    if (!target) return { status: 404, error: "Removed member not found" };
    await tx.member.update({
      where: { id: targetId },
      data: { removedAt: null },
    });
    return { ok: true };
  });
}

export function grantAdmin(targetId: number) {
  return serializable(async (tx) => {
    const target = await tx.member.findFirst({
      where: { id: targetId, ...ACTIVE_MEMBER },
    });
    if (!target) return { status: 404, error: "Member not found" };
    await tx.member.update({
      where: { id: targetId },
      data: { isAdmin: true },
    });
    return { ok: true };
  });
}

/** An admin gives up the role — unless they're the last one */
export function stepDownAsAdmin(memberId: number) {
  return serializable(async (tx) => {
    const me = await tx.member.findUnique({ where: { id: memberId } });
    if (!me?.isAdmin) return { status: 400, error: "You're not an admin" };
    if ((await otherActiveAdminCount(tx, memberId)) === 0) {
      return {
        status: 400,
        error: "You're the only admin. Make someone else an admin first.",
      };
    }
    await tx.member.update({
      where: { id: memberId },
      data: { isAdmin: false },
    });
    return { ok: true };
  });
}

/**
 * A member deletes their own account. Their personal details are wiped (name,
 * email, address, password) but the anonymous row stays, so meetings they
 * hosted and votes in finalized meetings still add up. The email is freed so
 * they could rejoin later.
 */
export async function deleteOwnAccount(memberId: number) {
  // Unusable password: a random value nobody knows, hashed like a real one
  const unusableHash = await bcrypt.hash(randomToken(), 12);
  return serializable(async (tx) => {
    const me = await tx.member.findUnique({ where: { id: memberId } });
    if (!me) return { status: 404, error: "Not found" };
    if (me.isAdmin && (await otherActiveAdminCount(tx, memberId)) === 0) {
      return {
        status: 400,
        error:
          "You're the only admin. Make someone else an admin before deleting your account.",
      };
    }
    if (await hostsOpenMeeting(tx, memberId)) {
      return {
        status: 400,
        error:
          "You're hosting the meeting being planned. Hand it to someone else before deleting your account.",
      };
    }
    await discardOpenVotes(tx, memberId);
    await tx.passwordResetToken.deleteMany({ where: { memberId } });
    await tx.member.update({
      where: { id: memberId },
      data: {
        name: "Former member",
        // Unique placeholder (.invalid is a reserved, never-routable domain)
        email: `deleted-${memberId}@deleted.invalid`,
        passwordHash: unusableHash,
        streetAddress: null,
        city: null,
        state: null,
        zipCode: null,
        country: null,
        isAdmin: false,
        deletedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
    });
    return { ok: true };
  });
}
