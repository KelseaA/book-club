import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { appUrl, hashToken, randomToken } from "../lib/tokens";

const RESET_TTL_MS = 60 * 60 * 1000; // links work for 1 hour
export const SALT_ROUNDS = 12;

/**
 * Creates a one-time reset link for a member and returns its URL. Any older
 * unused links for the member stop working, so only the latest email counts.
 */
export async function createResetLink(memberId: number): Promise<string> {
  const token = randomToken();
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { memberId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        memberId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    }),
  ]);
  return appUrl(`/reset-password?token=${token}`);
}

/**
 * Sets a new password from a reset link. Marks the link used and bumps the
 * member's sessionVersion, which signs them out of every existing session.
 * Returns the updated member, or null if the link is invalid/expired/used.
 */
export async function resetPasswordWithToken(token: string, password: string) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.$transaction(async (tx) => {
    // Claim the token atomically so it can't be used twice in a race
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) return null;

    const row = await tx.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hashToken(token) },
    });
    return tx.member.update({
      where: { id: row.memberId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  });
}
