/**
 * Makes a member an admin. A backstop in case the club ever ends up with no
 * admin who can sign in. Run with: npm run make-admin -- someone@example.com
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <member email>");
    process.exit(1);
  }
  const member = await prisma.member.findFirst({
    where: { email, removedAt: null, deletedAt: null },
  });
  if (!member) {
    console.error(`No active member with email ${email}.`);
    process.exit(1);
  }
  await prisma.member.update({
    where: { id: member.id },
    data: { isAdmin: true },
  });
  console.log(`${member.name} is now an admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
