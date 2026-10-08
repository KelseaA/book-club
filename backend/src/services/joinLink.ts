import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { randomToken } from "../lib/tokens";

// Works with the shared client or inside a transaction
type Db = typeof prisma | Prisma.TransactionClient;

/**
 * The club has one working join link at a time: the newest one that hasn't
 * been revoked. It's reusable, so a member can text the same link to
 * everyone. If there isn't one yet, any member viewing it creates it.
 */
export async function getOrCreateJoinLink(createdById: number | null) {
  const existing = await findActiveJoinLink(prisma);
  if (existing) return existing;
  return prisma.joinLink.create({
    data: { token: randomToken(), createdById },
  });
}

/** Revokes the current link (if it leaked) and issues a new one */
export async function resetJoinLink(createdById: number | null) {
  return prisma.$transaction(async (tx) => {
    await tx.joinLink.updateMany({
      where: { revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.joinLink.create({
      data: { token: randomToken(), createdById },
    });
  });
}

/** True if the token is the club's current, non-revoked join link */
export async function isValidJoinToken(db: Db, token: string) {
  const active = await findActiveJoinLink(db);
  return !!active && active.token === token;
}

function findActiveJoinLink(db: Db) {
  return db.joinLink.findFirst({
    where: { revokedAt: null },
    orderBy: { id: "desc" },
  });
}
