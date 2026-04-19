import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function getProfile(req: Request, res: Response) {
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });
  const { passwordHash: _, ...safe } = member;
  return res.json(safe);
}

export async function updateProfile(req: Request, res: Response) {
  const {
    name,
    streetAddress,
    city,
    state,
    zipCode,
    country,
    currentPassword,
    newPassword,
  } = req.body;

  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });

  let passwordHash = member.passwordHash;
  if (newPassword) {
    if (!currentPassword) {
      return res
        .status(400)
        .json({ error: "currentPassword required to set a new password" });
    }
    const match = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.member.update({
    where: { id: req.memberId! },
    data: { name, streetAddress, city, state, zipCode, country, passwordHash },
  });

  const { passwordHash: _, ...safe } = updated;
  return res.json(safe);
}

/** List all members (name + id only) for HostSelector component */
export async function listMembers(_req: Request, res: Response) {
  const members = await prisma.member.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return res.json(members);
}
