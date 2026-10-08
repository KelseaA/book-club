import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Works with the shared client or inside a transaction
type Db = typeof prisma | Prisma.TransactionClient;

// ── Pure scoring rules (no database; covered by results.test.ts) ─────────────

/** Ids of every item tied for the highest score (all items if none scored) */
export function leaderIds<T extends { id: number }>(
  items: T[],
  score: (item: T) => number,
): number[] {
  if (items.length === 0) return [];
  const top = Math.max(...items.map(score));
  return items.filter((i) => score(i) === top).map((i) => i.id);
}

/**
 * Borda count: with N books, rank 1 earns N points, rank 2 earns N-1, and so
 * on. Ballots always rank every book (enforced in voteController.submitVote),
 * so every book gets a score from every ballot. Returns points per book id.
 */
export function bordaPoints(
  bookIds: number[],
  ballots: { ranks: { bookOptionId: number; rank: number }[] }[],
): Map<number, number> {
  const n = bookIds.length;
  const points = new Map(bookIds.map((id) => [id, 0]));
  for (const ballot of ballots) {
    for (const r of ballot.ranks) {
      points.set(
        r.bookOptionId,
        (points.get(r.bookOptionId) ?? 0) + n - r.rank + 1,
      );
    }
  }
  return points;
}

/**
 * Who wins at finalize: the sole leader, or — when several options tie for
 * first — the host's tie-break choice, which must be one of the tied options.
 */
export function pickWinner(
  leaderIds: number[],
  tieBreakId: number | undefined,
): { id: number } | { error: string } {
  if (leaderIds.length === 0) return { error: "there are no options" };
  if (leaderIds.length === 1) {
    if (tieBreakId !== undefined && tieBreakId !== leaderIds[0]) {
      return { error: "there's no tie to break" };
    }
    return { id: leaderIds[0] };
  }
  if (tieBreakId === undefined) {
    return { error: "there's a tie — choose one of the tied options" };
  }
  if (!leaderIds.includes(tieBreakId)) {
    return { error: "the tie-break choice must be one of the tied options" };
  }
  return { id: tieBreakId };
}

// ── Database-backed results ──────────────────────────────────────────────────

/**
 * Book rankings for a meeting (Borda count, highest first). leaderIds holds
 * every book tied for first; more than one means the host breaks the tie.
 */
export async function computeBookResults(db: Db, meetingId: number) {
  const [bookOptions, ballots] = await Promise.all([
    db.bookOption.findMany({ where: { meetingId }, orderBy: { id: "asc" } }),
    db.bookVote.findMany({ where: { meetingId }, include: { ranks: true } }),
  ]);

  const points = bordaPoints(
    bookOptions.map((b) => b.id),
    ballots,
  );

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
