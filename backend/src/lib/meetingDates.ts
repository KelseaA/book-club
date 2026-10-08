/**
 * Meetings stay "upcoming" through the whole day they happen and move to the
 * archive the day after.
 */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** True once a finalized meeting's day is over, i.e. it belongs to the archive */
export function isArchived(meeting: {
  status: string;
  meetingDate: Date | null;
}): boolean {
  return (
    meeting.status === "FINALIZED" &&
    !!meeting.meetingDate &&
    meeting.meetingDate < startOfToday()
  );
}
