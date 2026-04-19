/**
 * Wipes all data from the database (preserving the schema) then re-seeds.
 * Run with: npm run db:reset
 */
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑  Clearing all data...");

  // Delete in dependency order (children before parents)
  await prisma.bookVoteRank.deleteMany();
  await prisma.bookVote.deleteMany();
  await prisma.dateSelection.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.bookOption.deleteMany();
  await prisma.dateOption.deleteMany();
  await prisma.bookClubMonth.deleteMany();
  await prisma.member.deleteMany();

  console.log("✅ All tables cleared.");

  await prisma.$disconnect();

  console.log("🌱 Re-seeding...\n");
  execSync("ts-node prisma/seed.ts", { stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
