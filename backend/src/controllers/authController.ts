import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const SALT_ROUNDS = 12;

// Cookie options — httpOnly prevents JS access, signed prevents tampering
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  signed: true,
};

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response) {
  const {
    name,
    email,
    password,
    streetAddress,
    city,
    state,
    zipCode,
    country,
  } = req.body;

  const existing = await prisma.member.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const member = await prisma.member.create({
    data: {
      name,
      email,
      passwordHash,
      streetAddress,
      city,
      state,
      zipCode,
      country,
    },
  });

  res.cookie("memberId", member.id.toString(), cookieOptions);
  return res.status(201).json(publicMember(member));
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const member = await prisma.member.findUnique({ where: { email } });
  if (!member) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, member.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.cookie("memberId", member.id.toString(), cookieOptions);
  return res.json(publicMember(member));
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("memberId");
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  const member = await prisma.member.findUnique({
    where: { id: req.memberId! },
  });
  if (!member) return res.status(404).json({ error: "Not found" });
  return res.json(publicMember(member));
}

/** Strip passwordHash before sending to client */
function publicMember(m: {
  id: number;
  name: string;
  email: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
}) {
  const { ...safe } = m;
  return safe;
}
