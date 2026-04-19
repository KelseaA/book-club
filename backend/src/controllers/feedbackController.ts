import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { sendFeedbackEmail } from "../lib/mailer";

export const feedbackSchema = z.object({
  message: z.string().min(1).max(2000),
});

export async function submitFeedback(req: Request, res: Response) {
  const { message } = req.body as { message: string };

  // Look up the submitting member for the email notification
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
    select: { name: true, email: true },
  });

  const feedback = await prisma.feedback.create({
    data: { memberId: req.memberId!, message },
  });

  // Fire-and-forget — don't fail the request if email sending fails
  if (member) {
    sendFeedbackEmail({
      fromName: member.name,
      fromEmail: member.email,
      message,
    }).catch((err) =>
      console.error("[mailer] Failed to send feedback email:", err),
    );
  }

  return res.status(201).json(feedback);
}
