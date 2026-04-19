import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const FINALIZED = "FINALIZED";

// ── Schemas ───────────────────────────────────────────────────────────────────

// bookRanks: array of { bookOptionId, rank } — rank 1 = top choice
export const submitBookVoteSchema = z.object({
  ranks: z
    .array(
      z.object({
        bookOptionId: z.number().int().positive(),
        rank: z.number().int().positive(),
      }),
    )
    .min(1),
});

// dateSelections: array of dateOptionIds the member is available for
export const submitDateVoteSchema = z.object({
  dateOptionIds: z.array(z.number().int().positive()),
});

// ── Book vote ─────────────────────────────────────────────────────────────────

export async function submitBookVote(req: Request, res: Response) {
  const { monthKey } = req.params;
  const { ranks } = req.body as {
    ranks: { bookOptionId: number; rank: number }[];
  };

  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: { bookOptions: true },
  });
  if (!month) return res.status(404).json({ error: "Month not found" });
  if (month.status === FINALIZED) {
    return res
      .status(400)
      .json({ error: "Month is finalized; voting is closed" });
  }

  // Prevent duplicate ballot
  const existing = await prisma.bookVote.findUnique({
    where: { monthId_memberId: { monthId: month.id, memberId: req.memberId! } },
  });
  if (existing) {
    return res
      .status(409)
      .json({
        error: "You have already submitted your book ballot for this month",
      });
  }

  // Validate that all bookOptionIds belong to this month
  const validIds = new Set(month.bookOptions.map((b: { id: number }) => b.id));
  for (const r of ranks) {
    if (!validIds.has(r.bookOptionId)) {
      return res
        .status(400)
        .json({
          error: `bookOptionId ${r.bookOptionId} does not belong to this month`,
        });
    }
  }

  // Create ballot and ranks in a transaction
  const vote = await prisma.$transaction(async (tx: typeof prisma) => {
    const ballot = await tx.bookVote.create({
      data: { monthId: month.id, memberId: req.memberId! },
    });
    await tx.bookVoteRank.createMany({
      data: ranks.map((r) => ({
        bookVoteId: ballot.id,
        bookOptionId: r.bookOptionId,
        rank: r.rank,
      })),
    });
    return ballot;
  });

  return res.status(201).json({ bookVoteId: vote.id });
}

// ── Date vote ─────────────────────────────────────────────────────────────────

export async function submitDateVote(req: Request, res: Response) {
  const { monthKey } = req.params;
  const { dateOptionIds } = req.body as { dateOptionIds: number[] };

  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: { dateOptions: true },
  });
  if (!month) return res.status(404).json({ error: "Month not found" });
  if (month.status === FINALIZED) {
    return res
      .status(400)
      .json({ error: "Month is finalized; voting is closed" });
  }

  // Check if member already submitted date availability
  // We treat any existing DateSelection for this member+month as a prior submission
  const existingSelections = await prisma.dateSelection.findMany({
    where: {
      memberId: req.memberId!,
      dateOption: { monthId: month.id },
    },
  });
  if (existingSelections.length > 0) {
    return res
      .status(409)
      .json({
        error:
          "You have already submitted your date availability for this month",
      });
  }

  // Validate dateOptionIds belong to this month
  const validDateIds = new Set(
    month.dateOptions.map((d: { id: number }) => d.id),
  );
  for (const id of dateOptionIds) {
    if (!validDateIds.has(id)) {
      return res
        .status(400)
        .json({ error: `dateOptionId ${id} does not belong to this month` });
    }
  }

  if (dateOptionIds.length > 0) {
    await prisma.dateSelection.createMany({
      data: dateOptionIds.map((dateOptionId) => ({
        dateOptionId,
        memberId: req.memberId!,
      })),
    });
  }

  return res.status(201).json({ ok: true });
}

// ── Results ───────────────────────────────────────────────────────────────────

/**
 * Compute Borda count results for books.
 * If there are N books, rank 1 gets N points, rank 2 gets N-1, etc.
 */
export async function getBookResults(req: Request, res: Response) {
  const { monthKey } = req.params;

  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: {
      bookOptions: true,
      bookVotes: { include: { ranks: true } },
      host: { select: { id: true, name: true } },
    },
  });
  if (!month) return res.status(404).json({ error: "Month not found" });

  // Only the host can see results before resultsVisible is true
  if (!month.resultsVisible && month.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Results are not yet visible" });
  }

  const N = month.bookOptions.length;
  // Accumulate Borda points per book option
  const pointsMap = new Map<number, number>(
    month.bookOptions.map((b: { id: number }) => [b.id, 0] as [number, number]),
  );

  for (const ballot of month.bookVotes) {
    for (const rankRow of ballot.ranks) {
      // Borda: rank 1 → N points, rank 2 → N-1 points, …
      const points = N - rankRow.rank + 1;
      pointsMap.set(
        rankRow.bookOptionId,
        (pointsMap.get(rankRow.bookOptionId) ?? 0) + points,
      );
    }
  }

  const results = month.bookOptions
    .map(
      (b: {
        id: number;
        title: string;
        author: string;
        notes: string | null;
        coverImageUrl: string | null;
      }) => ({ ...b, bordaPoints: pointsMap.get(b.id) ?? 0 }),
    )
    .sort(
      (a: { bordaPoints: number }, b: { bordaPoints: number }) =>
        b.bordaPoints - a.bordaPoints,
    );

  return res.json({
    monthKey,
    totalBallots: month.bookVotes.length,
    results,
  });
}

/** Compute date availability results (count of available members per date) */
export async function getDateResults(req: Request, res: Response) {
  const { monthKey } = req.params;

  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: {
      dateOptions: {
        include: {
          dateSelections: {
            include: { member: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!month) return res.status(404).json({ error: "Month not found" });

  if (!month.resultsVisible && month.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Results are not yet visible" });
  }

  const results = month.dateOptions
    .map(
      (d: {
        id: number;
        date: Date;
        label: string | null;
        dateSelections: { member: { id: number; name: string } }[];
      }) => ({
        id: d.id,
        date: d.date,
        label: d.label,
        count: d.dateSelections.length,
        availableMembers: d.dateSelections.map(
          (s: { member: { id: number; name: string } }) => s.member,
        ),
      }),
    )
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

  return res.json({ monthKey, results });
}

/** Returns whether the current member has already voted this month */
export async function getMyVoteStatus(req: Request, res: Response) {
  const { monthKey } = req.params;
  const month = await prisma.bookClubMonth.findUnique({ where: { monthKey } });
  if (!month) return res.status(404).json({ error: "Month not found" });

  const bookVote = await prisma.bookVote.findUnique({
    where: { monthId_memberId: { monthId: month.id, memberId: req.memberId! } },
    include: { ranks: { orderBy: { rank: "asc" } } },
  });

  const dateSelections = await prisma.dateSelection.findMany({
    where: { memberId: req.memberId!, dateOption: { monthId: month.id } },
  });

  return res.json({
    hasSubmittedBookVote: !!bookVote,
    bookVote: bookVote ?? null,
    hasSubmittedDateVote: dateSelections.length > 0,
    dateSelections,
  });
}
