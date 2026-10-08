import crypto from "crypto";

/** Unguessable URL-safe token for join and password reset links */
export function randomToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Reset tokens are stored hashed, like passwords (see PasswordResetToken) */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Base URL of the frontend, for links in emails and scripts */
export function appUrl(path: string): string {
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  return `${origin.replace(/\/$/, "")}${path}`;
}
