import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";
import { computeBookResults, computeDateResults } from "../services/results";
import { z } from "zod";

const FINALIZED = "FINALIZED";

export const setHostSchema = z.object({
  hostMemberId: z.number().int().positive(),
});

/**
 * Meetings stay "upcoming" through the whole day they happen and move to the
 * archive the day after.
 */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * During SETUP the host is still drafting, so only they see the book and date
 * options; everyone else sees them once voting opens. That way the host can
 * revise freely without members seeing half-finished lists.
 */
function forViewer<
  M extends {
    status: string;
    hostMemberId: number;
    bookOptions: unknown[];
    dateOptions: unknown[];
  },
>(meeting: M, memberId: number): M {
  if (meeting.status === "SETUP" && meeting.hostMemberId !== memberId) {
    return { ...meeting, bookOptions: [], dateOptions: [] };
  }
  return meeting;
}

/** The meeting currently being planned or voted on, if any */
function findActiveMeeting() {
  return prisma.meeting.findFirst({
    where: { status: { not: FINALIZED } },
    orderBy: { id: "desc" },
    include: meetingIncludes(),
  });
}

/**
 * GET /api/meetings/current — what the dashboard needs:
 * - upcoming: finalized meetings that haven't happened yet (book, date,
 *   location), soonest first. Usually one, but there can be more if the
 *   next round was planned and finalized before the last meeting happened.
 * - active: the meeting being planned or voted on, if anyone has started one
 */
export async function getCurrentMeetings(req: Request, res: Response) {
  const [upcoming, active] = await Promise.all([
    prisma.meeting.findMany({
      where: { status: FINALIZED, meetingDate: { gte: startOfToday() } },
      orderBy: { meetingDate: "asc" },
      include: meetingIncludes(),
    }),
    findActiveMeeting(),
  ]);

  return res.json({
    upcoming,
    active: active && forViewer(active, req.memberId!),
  });
}

/**
 * POST /api/meetings — any member can start planning the next meeting.
 * Only one meeting can be in SETUP/VOTING at a time; the member who starts
 * it becomes the host (and anyone can reassign it afterwards).
 */
export async function createMeeting(req: Request, res: Response) {
  // Serializable so two members clicking "start" at once can't both pass the
  // check; the loser gets a P2034 conflict, which errorHandler turns into 409
  const meeting = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.meeting.findFirst({
        where: { status: { not: FINALIZED } },
      });
      if (existing) return null;
      return tx.meeting.create({
        data: { hostMemberId: req.memberId! },
        include: meetingIncludes(),
      });
    },
    { isolationLevel: "Serializable" },
  );
  if (!meeting) {
    return res
      .status(409)
      .json({ error: "The next meeting is already being planned" });
  }
  return res.status(201).json(meeting);
}

export async function getMeeting(req: Request, res: Response) {
  const id = parseId(req.params.meetingId);
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: meetingIncludes(),
  });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  return res.json(forViewer(meeting, req.memberId!));
}

/** Archive listing: meetings that have happened, most recent first */
export async function listMeetings(_req: Request, res: Response) {
  const meetings = await prisma.meeting.findMany({
    where: { status: FINALIZED, meetingDate: { lt: startOfToday() } },
    orderBy: { meetingDate: "desc" },
    include: {
      host: { select: { id: true, name: true } },
      bookOptions: true,
      finalBookOption: true,
    },
  });
  return res.json(meetings);
}

/** Any authenticated member can set the host for a meeting that isn't finalized */
export async function setHost(req: Request, res: Response) {
  const id = parseId(req.params.meetingId);
  const { hostMemberId } = req.body;

  const hostExists = await prisma.member.findUnique({
    where: { id: hostMemberId },
  });
  if (!hostExists) return res.status(404).json({ error: "Member not found" });

  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.status === FINALIZED) {
    return res
      .status(400)
      .json({ error: "Cannot change host on a finalized meeting" });
  }

  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { hostMemberId },
    include: meetingIncludes(),
  });
  return res.json(forViewer(updated, req.memberId!));
}

/** Host opens voting, advancing meeting from SETUP → VOTING */
export async function openVoting(req: Request, res: Response) {
  const id = parseId(req.params.meetingId);
  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: { _count: { select: { bookOptions: true, dateOptions: true } } },
  });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Only the host can open voting" });
  }
  if (meeting.status !== "SETUP") {
    return res
      .status(400)
      .json({ error: "Voting is already open or meeting is finalized" });
  }
  if (meeting._count.bookOptions === 0) {
    return res
      .status(400)
      .json({ error: "Add at least one book before opening voting" });
  }
  // Finalizing needs a winning date, and dates lock once voting starts
  if (meeting._count.dateOptions === 0) {
    return res
      .status(400)
      .json({ error: "Add at least one date before opening voting" });
  }
  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { status: "VOTING" },
    include: meetingIncludes(),
  });
  return res.json(updated);
}

/** Host reveals results to all members */
export async function revealResults(req: Request, res: Response) {
  const id = parseId(req.params.meetingId);
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting) return res.status(404).json({ error: "Meeting not found" });
  if (meeting.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Only the host can reveal results" });
  }
  // Revealing during SETUP would expose the draft book list via the results
  if (meeting.status === "SETUP") {
    return res
      .status(400)
      .json({ error: "Open voting before revealing results" });
  }

  const updated = await prisma.meeting.update({
    where: { id: meeting.id },
    data: { resultsVisible: true, revealedAt: new Date() },
    include: meetingIncludes(),
  });
  return res.json(updated);
}

export const finalizeSchema = z.object({
  // Only needed when there's a tie; must be one of the tied options
  bookTieBreakId: z.number().int().positive().optional(),
  dateTieBreakId: z.number().int().positive().optional(),
});

/**
 * Host finalizes the meeting. The winners come from the votes, not from the
 * host: the top Borda score wins the book and the most-available date wins
 * the date. Only when several options tie for first does the host pick one
 * of the tied options (bookTieBreakId / dateTieBreakId). Finalizing saves the
 * winners plus a snapshot of the book ranking, makes results visible, and
 * locks the meeting.
 */
export async function finalizeMeeting(req: Request, res: Response) {
  const id = parseId(req.params.meetingId);
  const { bookTieBreakId, dateTieBreakId } = req.body as {
    bookTieBreakId?: number;
    dateTieBreakId?: number;
  };

  // Serializable so a vote landing mid-finalize can't change the counts
  // between computing the winners and saving them
  const outcome = await prisma.$transaction(
    async (tx) => {
      const meeting = await tx.meeting.findUnique({ where: { id } });
      if (!meeting) return { status: 404, error: "Meeting not found" };
      if (meeting.hostMemberId !== req.memberId) {
        return { status: 403, error: "Only the host can finalize the meeting" };
      }
      if (meeting.status !== "VOTING") {
        return {
          status: 400,
          error:
            meeting.status === FINALIZED
              ? "Meeting already finalized"
              : "Open voting before finalizing",
        };
      }

      const books = await computeBookResults(tx, meeting.id);
      const dates = await computeDateResults(tx, meeting.id);

      const book = pickWinner(books.leaderIds, bookTieBreakId);
      if ("error" in book) return { status: 400, error: `Book: ${book.error}` };
      const date = pickWinner(dates.leaderIds, dateTieBreakId);
      if ("error" in date) return { status: 400, error: `Date: ${date.error}` };

      const winningDate = dates.results.find((d) => d.id === date.id)!;
      const updated = await tx.meeting.update({
        where: { id: meeting.id },
        data: {
          status: "FINALIZED",
          resultsVisible: true, // finalization always makes results visible
          revealedAt: meeting.revealedAt ?? new Date(),
          finalBookOptionId: book.id,
          meetingDate: winningDate.date,
          // Frozen copy of the final ranking for the archive
          finalResultsSnapshot: JSON.stringify({
            totalBallots: books.totalBallots,
            ranking: books.results.map((b) => ({
              bookOptionId: b.id,
              title: b.title,
              author: b.author,
              bordaPoints: b.bordaPoints,
            })),
          }),
        },
        include: meetingIncludes(),
      });
      return { status: 200, meeting: updated };
    },
    { isolationLevel: "Serializable" },
  );

  if ("error" in outcome) {
    return res.status(outcome.status).json({ error: outcome.error });
  }
  return res.json(outcome.meeting);
}

/**
 * The winner is the sole leader; with a tie, the host's tie-break choice,
 * which must be one of the tied options.
 */
function pickWinner(
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

function meetingIncludes() {
  return {
    host: {
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
      },
    },
    bookOptions: { orderBy: { id: "asc" as const } },
    dateOptions: { orderBy: { date: "asc" as const } },
    finalBookOption: true,
    _count: { select: { bookVotes: true } },
  };
}
