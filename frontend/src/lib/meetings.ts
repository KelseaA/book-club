import type { Meeting } from "../types";

/** Meetings are titled by their winning book once there is one */
export function meetingTitle(meeting: Meeting): string {
  return meeting.finalBookOption?.title ?? "Next meeting";
}

/** e.g. "Thursday, October 29" (long) or "Oct 29, 2026" (short) */
export function formatMeetingDate(iso: string, style: "long" | "short") {
  return new Date(iso).toLocaleDateString(
    "en-US",
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" },
  );
}
