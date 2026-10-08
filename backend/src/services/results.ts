import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Works with the shared client or inside a transaction
type Db = typeof prisma | Prisma.TransactionClient;

/** Ids of every item tied for the highest score (all items if none scored) */
function leaderIds<T extends { id: number }>(
  items: T[],
  score: (item: T) => number,
): number[] {
  if (items.length === 0) return [];
  const top = Math.max(...items.map(score));
  return items.filter((i) => score(i) === top).map((i) => i.id);
}

/**
 * Borda count for a meeting's books: with N books, rank 1 earns N points,
 * rank 2 earns N-1, and so on. Ballots always rank every book (enforced in
 * voteController.submitVote), so every book gets a score from every ballot.
 *
 * leaderIds holds every book tied for first. More than one means the host
 * has to break the tie when finalizing.
 */
export async function computeBookResults(db: Db, meetingId: number) {
  const [bookOptions, ballots] = await Promise.all([
    db.bookOption.findMany({ where: { meetingId }, orderBy: { id: "asc" } }),
    db.bookVote.findMany({ where: { meetingId }, include: { ranks: true } }),
  ]);

  const n = bookOptions.length;
  const points = new Map(bookOptions.map((b) => [b.id, 0]));
  for (const ballot of ballots) {
    for (const r of ballot.ranks) {
      points.set(
        r.bookOptionId,
        (points.get(r.bookOptionId) ?? 0) + n - r.rank + 1,
      );
    }
  }

  const results = bookOptions
    .map((b) => ({ ...b, bordaPoints: points.get(b.id) ?? 0 }))
    .sort((a, b) => b.bordaPoints - a.bordaPoints);

  return {
    totalBallots: ballots.length,
    results,
    leaderIds: leaderIds(results, (b) => b.bordaPoints),
  };
}

/**
 * Date availability: how many members can make each date option.
 * leaderIds holds every date tied for the most available members.
 */
export async function computeDateResults(db: Db, meetingId: number) {
  const dateOptions = await db.dateOption.findMany({
    where: { meetingId },
    orderBy: { date: "asc" },
    include: {
      dateSelections: {
        include: { member: { select: { id: true, name: true } } },
      },
    },
  });

  const results = dateOptions
    .map((d) => ({
      id: d.id,
      date: d.date,
      count: d.dateSelections.length,
      availableMembers: d.dateSelections.map((s) => s.member),
    }))
    // Stable sort keeps earlier dates first among equal counts
    .sort((a, b) => b.count - a.count);

  return { results, leaderIds: leaderIds(results, (d) => d.count) };
}
