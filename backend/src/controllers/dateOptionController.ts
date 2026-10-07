import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { parseId } from "../lib/params";
import { z } from "zod";
const FINALIZED = "FINALIZED";

export const dateOptionSchema = z.object({
  date: z.string().datetime(),
});

const MAX_DATES = 4;

async function getMeetingAndAssertHost(
  meetingId: number,
  memberId: number,
  res: Response,
) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      dateOptions: true,
      _count: { select: { bookVotes: true } },
    },
  });
  if (!meeting) {
    res.status(404).json({ error: "Meeting not found" });
    return null;
  }
  if (meeting.hostMemberId !== memberId) {
    res.status(403).json({ error: "Only the host can manage date options" });
    return null;
  }
  if (meeting.status === FINALIZED) {
    res.status(400).json({ error: "Meeting is finalized" });
    return null;
  }
  // Once anyone has voted, the date list is frozen: an added date couldn't be
  // picked by earlier voters, and an edited one would change what they chose.
  // (Every vote creates a BookVote, so its count covers date voting too.)
  if (meeting._count.bookVotes > 0) {
    res.status(400).json({
      error: "Votes have already been cast — date options cannot be changed",
    });
    return null;
  }
  return meeting;
}

export async function addDate(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res);
  if (!meeting) return;

  if (meeting.dateOptions.length >= MAX_DATES) {
    return res
      .status(400)
      .json({ error: `Maximum ${MAX_DATES} date options allowed` });
  }

  const { date } = req.body;
  const dateOption = await prisma.dateOption.create({
    data: { meetingId: meeting.id, date: new Date(date) },
  });
  return res.status(201).json(dateOption);
}

export async function updateDate(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const { dateId } = req.params;
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res);
  if (!meeting) return;

  const dateOption = meeting.dateOptions.find(
    (d: { id: number }) => d.id === Number(dateId),
  );
  if (!dateOption)
    return res.status(404).json({ error: "Date option not found" });

  const { date } = req.body;
  const updated = await prisma.dateOption.update({
    where: { id: dateOption.id },
    data: { date: new Date(date) },
  });
  return res.json(updated);
}

export async function deleteDate(req: Request, res: Response) {
  const meetingId = parseId(req.params.meetingId);
  const { dateId } = req.params;
  const meeting = await getMeetingAndAssertHost(meetingId, req.memberId!, res);
  if (!meeting) return;

  const dateOption = meeting.dateOptions.find(
    (d: { id: number }) => d.id === Number(dateId),
  );
  if (!dateOption)
    return res.status(404).json({ error: "Date option not found" });

  await prisma.dateOption.delete({ where: { id: dateOption.id } });
  return res.status(204).send();
}
