import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
// MonthStatus values as const to avoid Prisma client generation requirement at compile time
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

async function getMonthAndAssertHost(
  monthKey: string,
  memberId: number,
  res: Response,
) {
  const month = await prisma.bookClubMonth.findUnique({
    where: { monthKey },
    include: { bookOptions: true },
  });
  if (!month) {
    res.status(404).json({ error: "Month not found" });
    return null;
  }
  if (month.hostMemberId !== memberId) {
    res.status(403).json({ error: "Only the host can manage book proposals" });
    return null;
  }
  if (month.status === FINALIZED) {
    res.status(400).json({ error: "Month is finalized" });
    return null;
  }
  return month;
}

export async function addBook(req: Request, res: Response) {
  const { monthKey } = req.params;
  const month = await getMonthAndAssertHost(monthKey, req.memberId!, res);
  if (!month) return;

  if (month.bookOptions.length >= MAX_BOOKS) {
    return res
      .status(400)
      .json({ error: `Maximum ${MAX_BOOKS} book options allowed` });
  }

  const { title, author, notes, genres, coverImageUrl, sourceUrl } = req.body;
  const book = await prisma.bookOption.create({
    data: {
      monthId: month.id,
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
  const { monthKey, bookId } = req.params;
  const month = await getMonthAndAssertHost(monthKey, req.memberId!, res);
  if (!month) return;

  const book = month.bookOptions.find(
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
  const { monthKey, bookId } = req.params;
  const month = await getMonthAndAssertHost(monthKey, req.memberId!, res);
  if (!month) return;

  const book = month.bookOptions.find(
    (b: { id: number }) => b.id === Number(bookId),
  );
  if (!book) return res.status(404).json({ error: "Book option not found" });

  await prisma.bookOption.delete({ where: { id: book.id } });
  return res.status(204).send();
}
