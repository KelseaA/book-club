import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";
import { z } from "zod";

const FINALIZED = "FINALIZED";

// ── Schemas ───────────────────────────────────────────────────────────────────

// A member's whole vote, submitted once:
// ranks — every book option in order of preference (rank 1 = top choice)
// dateOptionIds — the dates they're available for (may be empty)
export const submitVoteSchema = z.object({
  ranks: z
    .array(
      z.object({
        bookOptionId: z.number().int().positive(),
        rank: z.number().int().positive(),
      }),
    )
    .min(1),
  dateOptionIds: z.array(z.number().int().positive()),
});

// ── Submit vote ───────────────────────────────────────────────────────────────

/**
 * Saves the member's book ballot and date availability together in one
 * transaction, so a vote can't end up half-submitted.
 *
 * The BookVote row doubles as the "this member has voted" marker. That's what
 * locks the date selection too, even when the member picked no dates (which
 * leaves no DateSelection rows to detect).
 */
export async function submitVote(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const { ranks, dateOptionIds } = req.body as {
    ranks: { bookOptionId: number; rank: number }[];
    dateOptionIds: number[];
  };

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { bookOptions: true, dateOptions: true },
  });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.status === "SETUP") {
    return res.status(400).json({ error: "Voting has not been opened yet" });
  }
  if (meeting.status === FINALIZED) {
    return res
      .status(400)
      .json({ error: "Meeting is finalized; voting is closed" });
  }

  // Prevent duplicate vote
  const existing = await prisma.bookVote.findUnique({
    where: {
      meetingId_memberId: { meetingId: meeting.id, memberId: req.memberId! },
    },
  });
  if (existing) {
    return res
      .status(409)
      .json({ error: "You have already voted for this meeting" });
  }

  // Borda count assumes a complete ranking: each of the N books appears
  // exactly once, with ranks 1..N
  const bookIds = new Set(meeting.bookOptions.map((b) => b.id));
  const rankedIds = new Set(ranks.map((r) => r.bookOptionId));
  const rankValues = new Set(ranks.map((r) => r.rank));
  const n = bookIds.size;
  const isCompleteRanking =
    ranks.length === n &&
    rankedIds.size === n &&
    [...rankedIds].every((id) => bookIds.has(id)) &&
    rankValues.size === n &&
    [...rankValues].every((r) => r >= 1 && r <= n);
  if (!isCompleteRanking) {
    return res.status(400).json({
      error:
        "Your ballot must rank every book exactly once. The book list may have changed — refresh and try again.",
    });
  }

  const validDateIds = new Set(meeting.dateOptions.map((d) => d.id));
  const selectedDateIds = [...new Set(dateOptionIds)];
  if (!selectedDateIds.every((id) => validDateIds.has(id))) {
    return res.status(400).json({
      error:
        "One of your selected dates is no longer an option. Refresh and try again.",
    });
  }

  const vote = await prisma.$transaction(async (tx) => {
    const ballot = await tx.bookVote.create({
      data: { meetingId: meeting.id, memberId: req.memberId! },
    });
    await tx.bookVoteRank.createMany({
      data: ranks.map((r) => ({
        bookVoteId: ballot.id,
        bookOptionId: r.bookOptionId,
        rank: r.rank,
      })),
    });
    await tx.dateSelection.createMany({
      data: selectedDateIds.map((dateOptionId) => ({
        dateOptionId,
        memberId: req.memberId!,
      })),
    });
    return ballot;
  });

  return res.status(201).json({ bookVoteId: vote.id });
}

// ── Results ───────────────────────────────────────────────────────────────────

/**
 * Compute Borda count results for books.
 * If there are N books, rank 1 gets N points, rank 2 gets N-1, etc.
 */
export async function getBookResults(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      bookOptions: true,
      bookVotes: { include: { ranks: true } },
      host: { select: { id: true, name: true } },
    },
  });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  // Only the host can see results before resultsVisible is true
  if (!meeting.resultsVisible && meeting.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Results are not yet visible" });
  }

  const N = meeting.bookOptions.length;
  // Accumulate Borda points per book option
  const pointsMap = new Map<number, number>(
    meeting.bookOptions.map(
      (b: { id: number }) => [b.id, 0] as [number, number],
    ),
  );

  for (const ballot of meeting.bookVotes) {
    for (const rankRow of ballot.ranks) {
      // Borda: rank 1 → N points, rank 2 → N-1 points, …
      const points = N - rankRow.rank + 1;
      pointsMap.set(
        rankRow.bookOptionId,
        (pointsMap.get(rankRow.bookOptionId) ?? 0) + points,
      );
    }
  }

  const results = meeting.bookOptions
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
    meetingId,
    totalBallots: meeting.bookVotes.length,
    results,
  });
}

/** Compute date availability results (count of available members per date) */
export async function getDateResults(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
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
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  if (!meeting.resultsVisible && meeting.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Results are not yet visible" });
  }

  const results = meeting.dateOptions
    .map(
      (d: {
        id: number;
        date: Date;
        dateSelections: { member: { id: number; name: string } }[];
      }) => ({
        id: d.id,
        date: d.date,
        count: d.dateSelections.length,
        availableMembers: d.dateSelections.map(
          (s: { member: { id: number; name: string } }) => s.member,
        ),
      }),
    )
    .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

  return res.json({ meetingId, results });
}

/** Returns whether the current member has already voted this meeting */
export async function getMyVoteStatus(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });

  const bookVote = await prisma.bookVote.findUnique({
    where: {
      meetingId_memberId: { meetingId: meeting.id, memberId: req.memberId! },
    },
    include: { ranks: { orderBy: { rank: "asc" } } },
  });

  const dateSelections = await prisma.dateSelection.findMany({
    where: { memberId: req.memberId!, dateOption: { meetingId: meeting.id } },
  });

  return res.json({
    hasVoted: !!bookVote,
    bookVote: bookVote ?? null,
    dateSelections,
  });
}
