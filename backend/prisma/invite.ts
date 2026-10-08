/**
 * Prints the club's join link, creating one if needed. Use it to get the very
 * first member in (nobody can sign in to copy it from the Members page yet).
 * Run with: npm run invite
 */
import { prisma } from "../src/lib/prisma";
import { appUrl } from "../src/lib/tokens";
import { getOrCreateJoinLink } from "../src/services/joinLink";

async function main() {
  const link = await getOrCreateJoinLink(null);
  console.log(
    `\nJoin link (reusable — text it to anyone joining):\n\n  ${appUrl(`/join/${link.token}`)}\n`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
