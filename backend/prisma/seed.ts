import { PrismaClient, MonthStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Members ───────────────────────────────────────────────────────────────
  const password = await bcrypt.hash("password123", 12);

  const alice = await prisma.member.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Nguyen",
      email: "alice@example.com",
      passwordHash: password,
      streetAddress: "123 Maple St",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      country: "USA",
    },
  });

  const bob = await prisma.member.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      name: "Bob Patel",
      email: "bob@example.com",
      passwordHash: password,
      streetAddress: "456 Oak Ave",
      city: "Portland",
      state: "OR",
      zipCode: "97202",
      country: "USA",
    },
  });

  const carol = await prisma.member.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      name: "Carol Kim",
      email: "carol@example.com",
      passwordHash: password,
    },
  });

  console.log(`Created members: ${alice.name}, ${bob.name}, ${carol.name}`);

  // ── Current month (VOTING status) ─────────────────────────────────────────
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonth = await prisma.bookClubMonth.upsert({
    where: { monthKey: currentMonthKey },
    update: {},
    create: {
      monthKey: currentMonthKey,
      hostMemberId: alice.id,
      status: MonthStatus.SETUP,
    },
  });
  console.log(`Created current month: ${currentMonthKey} (host: Alice)`);

  // ── Book options ──────────────────────────────────────────────────────────
  const existingBooks = await prisma.bookOption.count({
    where: { monthId: currentMonth.id },
  });
  if (existingBooks === 0) {
    const books = await prisma.bookOption.createMany({
      data: [
        {
          monthId: currentMonth.id,
          title: "Piranesi",
          author: "Susanna Clarke",
          notes: "Mysterious and dreamlike novella",
          coverImageUrl: "https://covers.openlibrary.org/b/id/10521270-L.jpg",
        },
        {
          monthId: currentMonth.id,
          title: "The House in the Cerulean Sea",
          author: "TJ Klune",
          notes: "Cozy fantasy",
          coverImageUrl: "https://covers.openlibrary.org/b/id/10700765-L.jpg",
        },
        {
          monthId: currentMonth.id,
          title: "Babel",
          author: "R.F. Kuang",
          notes: "Dark academia set in Oxford",
        },
      ],
    });
    console.log(`Created ${books.count} book options`);
  }

  // ── Date options ──────────────────────────────────────────────────────────
  const existingDates = await prisma.dateOption.count({
    where: { monthId: currentMonth.id },
  });
  if (existingDates === 0) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await prisma.dateOption.createMany({
      data: [
        {
          monthId: currentMonth.id,
          date: new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth(),
            5,
            19,
            0,
          ),
          label: "Saturday evening",
        },
        {
          monthId: currentMonth.id,
          date: new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth(),
            12,
            19,
            0,
          ),
          label: "Saturday evening",
        },
        {
          monthId: currentMonth.id,
          date: new Date(
            nextMonth.getFullYear(),
            nextMonth.getMonth(),
            19,
            19,
            0,
          ),
          label: "Saturday evening",
        },
      ],
    });
    console.log("Created 3 date options");
  }

  // ── Past month (FINALIZED) ────────────────────────────────────────────────
  const pastMonthKey =
    `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}` ||
    `${now.getFullYear() - 1}-12`;
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const pastKey = `${y}-${String(m).padStart(2, "0")}`;

  const pastMonth = await prisma.bookClubMonth.upsert({
    where: { monthKey: pastKey },
    update: {},
    create: {
      monthKey: pastKey,
      hostMemberId: bob.id,
      status: MonthStatus.FINALIZED,
      resultsVisible: true,
      revealedAt: new Date(),
      finalMeetingDate: new Date(y, m - 1, 15, 19, 0),
    },
  });

  // Add a finalized book option
  const existingPastBooks = await prisma.bookOption.findMany({
    where: { monthId: pastMonth.id },
  });
  if (existingPastBooks.length === 0) {
    const winnerBook = await prisma.bookOption.create({
      data: {
        monthId: pastMonth.id,
        title: "The Midnight Library",
        author: "Matt Haig",
        notes: "Winner of last month",
      },
    });
    await prisma.bookOption.create({
      data: {
        monthId: pastMonth.id,
        title: "Project Hail Mary",
        author: "Andy Weir",
      },
    });
    // Set winning book
    await prisma.bookClubMonth.update({
      where: { id: pastMonth.id },
      data: { finalBookOptionId: winnerBook.id },
    });
  }

  console.log(`Created past month: ${pastKey} (finalized)`);
  console.log("✅ Seeding complete!");
  console.log("\nTest credentials (all use password: password123):");
  console.log("  alice@example.com (current month host)");
  console.log("  bob@example.com");
  console.log("  carol@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
