import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";
import { z } from "zod";
// MeetingStatus values as const to avoid Prisma client generation requirement at compile time
const FINALIZED = "FINALIZED";

export const bookOptionSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().min(1).max(200),
  notes: z.string().max(1000).optional(),
  genres: z.string().max(500).optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

const MAX_BOOKS = 5;

async function getMeetingAndAssertHost(
  meetingId: number,
  memberId: number,
  res: Response,
  opts: { blockIfVoted?: boolean } = {},
) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      bookOptions: true,
      _count: { select: { bookVotes: true } },
    },
  });
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return null;
  }
  if (meeting.hostMemberId !== memberId) {
    res.status(403).json({ error: "Only the host can manage book proposals" });
    return null;
  }
  if (meeting.status === FINALIZED) {
    res.status(400).json({ error: "Meeting is finalized" });
    return null;
  }
  if (opts.blockIfVoted && meeting._count.bookVotes > 0) {
    res.status(400).json({
      error: "Votes have already been cast — book list cannot be changed",
    });
    return null;
  }
  return meeting;
}

export async function addBook(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res, {
    blockIfVoted: true,
  });
  if (!meeting) return;

  if (meeting.bookOptions.length >= MAX_BOOKS) {
    return res
      .status(400)
      .json({ error: `Maximum ${MAX_BOOKS} book options allowed` });
  }

  const { title, author, notes, genres, coverImageUrl, sourceUrl } = req.body;
  const book = await prisma.bookOption.create({
    data: {
      meetingId: meeting.id,
      title,
      author,
      notes: notes || null,
      genres: genres || null,
      coverImageUrl: coverImageUrl || null,
      sourceUrl: sourceUrl || null,
    },
  });
  return res.status(201).json(book);
}

export async function updateBook(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const { bookId } = req.params;
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res, {
    blockIfVoted: true,
  });
  if (!meeting) return;

  const book = meeting.bookOptions.find(
    (b: { id: number }) => b.id === Number(bookId),
  );
  if (!book) return res.status(404).json({ error: "Book option not found" });

  const { title, author, notes, genres, coverImageUrl, sourceUrl } = req.body;
  const updated = await prisma.bookOption.update({
    where: { id: book.id },
    data: {
      title,
      author,
      notes: notes || null,
      genres: genres || null,
      coverImageUrl: coverImageUrl || null,
      sourceUrl: sourceUrl || null,
    },
  });
  return res.json(updated);
}

export async function deleteBook(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const { bookId } = req.params;
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res, {
    blockIfVoted: true,
  });
  if (!meeting) return;

  const book = meeting.bookOptions.find(
    (b: { id: number }) => b.id === Number(bookId),
  );
  if (!book) return res.status(404).json({ error: "Book option not found" });

  await prisma.bookOption.delete({ where: { id: book.id } });
  return res.status(204).send();
}
