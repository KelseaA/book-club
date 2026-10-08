import { PrismaClient, MeetingStatus } from "@prisma/client";
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

  // ── Meetings ──────────────────────────────────────────────────────────────
  // Meetings have no natural key to upsert on, so only seed them once
  if ((await prisma.meeting.count()) > 0) {
    console.log("Meetings already exist — skipping meeting seed");
  } else {
    await seedMeetings(alice.id, bob.id, carol.id);
  }

  console.log("✅ Seeding complete!");
  console.log("\nTest credentials (all use password: password123):");
  console.log("  alice@example.com (host of the upcoming meeting)");
  console.log("  bob@example.com");
  console.log("  carol@example.com (host of the meeting being planned)");
}

/** A date `days` from today at the standard 7:30 PM meeting time */
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(19, 30, 0, 0);
  return d;
}

/**
 * Seeds one meeting in each state the dashboard and archive care about:
 * a past finalized meeting, an upcoming finalized one, and one being planned.
 */
async function seedMeetings(aliceId: number, bobId: number, carolId: number) {
  // Past meeting (Bob hosted) — shows up in the archive
  const past = await prisma.meeting.create({
    data: {
      hostMemberId: bobId,
      status: MeetingStatus.FINALIZED,
      resultsVisible: true,
      revealedAt: daysFromNow(-50),
      meetingDate: daysFromNow(-42),
    },
  });
  const pastWinner = await prisma.bookOption.create({
    data: {
      meetingId: past.id,
      title: "The Midnight Library",
      author: "Matt Haig",
      coverImageUrl: "https://covers.openlibrary.org/b/id/10313767-L.jpg",
    },
  });
  const pastRunnerUp = await prisma.bookOption.create({
    data: {
      meetingId: past.id,
      title: "Project Hail Mary",
      author: "Andy Weir",
      coverImageUrl: "https://covers.openlibrary.org/b/id/11200092-L.jpg",
    },
  });
  await prisma.meeting.update({
    where: { id: past.id },
    data: { finalBookOptionId: pastWinner.id },
  });
  // Ballots so the archive shows a real ranking (Borda: 5 pts vs 4 pts)
  for (const [memberId, first, second] of [
    [aliceId, pastWinner.id, pastRunnerUp.id],
    [bobId, pastWinner.id, pastRunnerUp.id],
    [carolId, pastRunnerUp.id, pastWinner.id],
  ]) {
    await prisma.bookVote.create({
      data: {
        meetingId: past.id,
        memberId,
        ranks: {
          create: [
            { bookOptionId: first, rank: 1 },
            { bookOptionId: second, rank: 2 },
          ],
        },
      },
    });
  }

  // Upcoming meeting (Alice hosting) — finalized, shows in the "Upcoming meeting" card
  const upcoming = await prisma.meeting.create({
    data: {
      hostMemberId: aliceId,
      status: MeetingStatus.FINALIZED,
      resultsVisible: true,
      revealedAt: daysFromNow(-10),
      meetingDate: daysFromNow(21),
    },
  });
  const upcomingWinner = await prisma.bookOption.create({
    data: {
      meetingId: upcoming.id,
      title: "Piranesi",
      author: "Susanna Clarke",
      notes: "Mysterious and dreamlike novella",
      coverImageUrl: "https://covers.openlibrary.org/b/id/10226290-L.jpg",
    },
  });
  await prisma.bookOption.create({
    data: { meetingId: upcoming.id, title: "Babel", author: "R.F. Kuang" },
  });
  await prisma.meeting.update({
    where: { id: upcoming.id },
    data: { finalBookOptionId: upcomingWinner.id },
  });

  // Next meeting (Carol hosting) — still in setup, with proposals ready
  const next = await prisma.meeting.create({
    data: { hostMemberId: carolId, status: MeetingStatus.SETUP },
  });
  await prisma.bookOption.createMany({
    data: [
      {
        meetingId: next.id,
        title: "The House in the Cerulean Sea",
        author: "TJ Klune",
        notes: "Cozy fantasy",
        coverImageUrl: "https://covers.openlibrary.org/b/id/9312772-L.jpg",
      },
      {
        meetingId: next.id,
        title: "Tomorrow, and Tomorrow, and Tomorrow",
        author: "Gabrielle Zevin",
      },
      {
        meetingId: next.id,
        title: "The Remains of the Day",
        author: "Kazuo Ishiguro",
      },
    ],
  });
  await prisma.dateOption.createMany({
    data: [49, 56, 63].map((days) => ({
      meetingId: next.id,
      date: daysFromNow(days),
    })),
  });

  console.log("Created meetings: 1 past, 1 upcoming, 1 being planned");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
