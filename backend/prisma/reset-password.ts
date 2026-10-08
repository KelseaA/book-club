/**
 * Prints a one-time password reset link for a member, without emailing it.
 * A fallback for when someone's email doesn't work (e.g. a typo at sign-up).
 * Run with: npm run reset-password -- someone@example.com
 */
import { prisma } from "../src/lib/prisma";
import { createResetLink } from "../src/services/passwordReset";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run reset-password -- <member email>");
    process.exit(1);
  }
  const member = await prisma.member.findUnique({ where: { email } });
  if (!member) {
    const all = await prisma.member.findMany({ select: { email: true } });
    console.error(
      `No member with email ${email}. Members: ${all.map((m) => m.email).join(", ")}`,
    );
    process.exit(1);
  }
  const link = await createResetLink(member.id);
  console.log(
    `\nReset link for ${member.name} (works once, expires in 1 hour):\n\n  ${link}\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
