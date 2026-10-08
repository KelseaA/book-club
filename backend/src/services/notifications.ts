import { prisma } from "../lib/prisma";
import { appUrl } from "../lib/tokens";
import { sendMeetingAnnouncedEmail, sendVotingOpenEmail } from "../lib/mailer";
import { ACTIVE_MEMBER } from "./admin";

/**
 * Meeting times are stored in UTC but the club meets in one place, so emails
 * format them in the club's time zone. Without this, a server running in UTC
 * would show a 7:30 PM Central meeting as the next day.
 */
const CLUB_TIMEZONE = process.env.CLUB_TIMEZONE || "America/Chicago";

/** Opted-in active members, minus the host (they're the one who acted) */
function recipients(hostMemberId: number) {
  return prisma.member.findMany({
    where: {
      ...ACTIVE_MEMBER,
      emailNotifications: true,
      id: { not: hostMemberId },
    },
    select: { email: true, name: true },
  });
}

/**
 * Sends one email per recipient (so nobody sees anyone else's address) and
 * waits for all of them, because serverless hosts can stop work once the
 * response is sent. One failed email never blocks the others or the action.
 */
async function sendAll(
  to: { email: string; name: string }[],
  send: (r: { email: string; name: string }) => Promise<unknown>,
) {
  const results = await Promise.allSettled(to.map(send));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[notify] Failed to email ${to[i].email}:`, r.reason);
    }
  });
}

export async function notifyVotingOpened(meetingId: number) {
  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { host: { select: { name: true } } },
  });
  await sendAll(await recipients(meeting.hostMemberId), (r) =>
    sendVotingOpenEmail({
      to: r.email,
      name: r.name,
      hostName: meeting.host.name,
      link: appUrl("/dashboard"),
    }),
  );
}

export async function notifyMeetingAnnounced(meetingId: number) {
  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: { host: true, finalBookOption: true },
  });
  if (!meeting.finalBookOption || !meeting.meetingDate) return;

  const when = meeting.meetingDate.toLocaleString("en-US", {
    timeZone: CLUB_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const { host } = meeting;
  const location =
    [host.streetAddress, host.city, host.zipCode].filter(Boolean).join(", ") ||
    null;

  await sendAll(await recipients(meeting.hostMemberId), (r) =>
    sendMeetingAnnouncedEmail({
      to: r.email,
      name: r.name,
      bookTitle: meeting.finalBookOption!.title,
      bookAuthor: meeting.finalBookOption!.author,
      when,
      hostName: host.name,
      location,
      link: appUrl("/dashboard"),
    }),
  );
}
