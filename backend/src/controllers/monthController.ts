import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const FINALIZED = "FINALIZED";

export const setHostSchema = z.object({
  hostMemberId: z.number().int().positive(),
});

/** Returns the current calendar month key in YYYY-MM format */
function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Get a month by key, auto-creating it if it is the current month and doesn't exist yet.
 * Requires an authenticated user so we can assign an initial host.
 */
export async function getOrCreateCurrentMonth(req: Request, res: Response) {
  const monthKey = currentMonthKey();
  let month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: monthIncludes(),
  });

  if (!month) {
    // Auto-create: requesting member becomes first host
    month = await prisma.bookClubMonth.create({
      data: { monthKey, hostMemberId: req.memberId! },
      include: monthIncludes(),
    });
  }

  return res.json(month);
}

export async function getMonthByKey(req: Request, res: Response) {
  const { monthKey } = req.params;
  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: monthIncludes(),
  });
  if (!month) return res.status(404).json({ error: "Month not found" });
  return res.json(month);
}

export async function listMonths(_req: Request, res: Response) {
  const months = await prisma.bookClubMonth.findMany({
    orderBy: { monthKey: "desc" },
    include: {
      host: { select: { id: true, name: true } },
      bookOptions: true,
      finalBookOption: true,
    },
  });
  return res.json(months);
}

/** Any authenticated member can set the host for the current month */
export async function setHost(req: Request, res: Response) {
  const { monthKey } = req.params;
  const { hostMemberId } = req.body;

  const hostExists = await prisma.member.findUnique({
    where: { id: hostMemberId },
  });
  if (!hostExists) return res.status(404).json({ error: "Member not found" });

  const month = await prisma.bookClubMonth.findUnique({ where: { monthKey } });
  if (!month) return res.status(404).json({ error: "Month not found" });
  if (month.status === FINALIZED) {
    return res
      .status(400)
      .json({ error: "Cannot change host on a finalized month" });
  }

  const updated = await prisma.bookClubMonth.update({
    where: { monthKey },
    data: { hostMemberId },
    include: monthIncludes(),
  });
  return res.json(updated);
}

/** Host reveals results to all members */
export async function revealResults(req: Request, res: Response) {
  const { monthKey } = req.params;
  const month = await prisma.bookClubMonth.findUnique({ where: { monthKey } });
  if (!month) return res.status(404).json({ error: "Month not found" });
  if (month.hostMemberId !== req.memberId) {
    return res.status(403).json({ error: "Only the host can reveal results" });
  }

  const updated = await prisma.bookClubMonth.update({
    where: { monthKey },
    data: { resultsVisible: true, revealedAt: new Date() },
    include: monthIncludes(),
  });
  return res.json(updated);
}

export const finalizeSchema = z.object({
  finalBookOptionId: z.number().int().positive(),
  finalMeetingDate: z.string().datetime(),
});

/** Host finalizes the month, locking everything and saving the winners */
export async function finalizeMonth(req: Request, res: Response) {
  const { monthKey } = req.params;
  const { finalBookOptionId, finalMeetingDate } = req.body;

  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: { bookOptions: true },
  });
  if (!month) return res.status(404).json({ error: "Month not found" });
  if (month.hostMemberId !== req.memberId) {
    return res
      .status(403)
      .json({ error: "Only the host can finalize the month" });
  }
  if (month.status === FINALIZED) {
    return res.status(400).json({ error: "Month already finalized" });
  }

  // Ensure the chosen book belongs to this month
  const bookBelongs = month.bookOptions.some(
    (b: { id: number }) => b.id === finalBookOptionId,
  );
  if (!bookBelongs) {
    return res
      .status(400)
      .json({ error: "finalBookOptionId does not belong to this month" });
  }

  const updated = await prisma.bookClubMonth.update({
    where: { monthKey },
    data: {
      status: "FINALIZED",
      resultsVisible: true, // finalization always makes results visible
      finalBookOptionId,
      finalMeetingDate: new Date(finalMeetingDate),
    },
    include: monthIncludes(),
  });
  return res.json(updated);
}

function monthIncludes() {
  return {
    host: { select: { id: true, name: true } },
    bookOptions: { orderBy: { id: "asc" as const } },
    dateOptions: { orderBy: { date: "asc" as const } },
    finalBookOption: true,
  };
}
