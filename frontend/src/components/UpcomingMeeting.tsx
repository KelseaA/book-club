import type { Meeting } from "../types";
import { formatMeetingDate, meetingTitle } from "../lib/meetings";

/**
 * The finalized meeting that hasn't happened yet: what to read, when, and
 * where. Shown on the dashboard until the meeting day is over.
 */
export default function UpcomingMeeting({ meeting }: { meeting: Meeting }) {
  const book = meeting.finalBookOption;
  const { host } = meeting;
  // Host address — only shown if the host has filled it in
  const location = [host.streetAddress, host.city, host.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    // The dashboard's focal point: bigger and bolder than anything below it
    <section className="rounded-2xl border-2 border-brand-300 bg-brand-50 shadow-md p-6 sm:p-8">
      <p className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-4">
        Upcoming meeting
      </p>
      <div className="flex items-start gap-6">
        {book?.coverImageUrl && (
          <img
            src={book.coverImageUrl}
            alt=""
            className="w-24 h-36 sm:w-32 sm:h-48 object-cover rounded-md shadow-md shrink-0"
          />
        )}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
            {meetingTitle(meeting)}
          </h1>
          {book && <p className="text-lg text-gray-600">{book.author}</p>}
          {meeting.meetingDate && (
            <p className="text-brand-700 pt-2">
              <strong>When:</strong>{" "}
              {formatMeetingDate(meeting.meetingDate, "long")} at 7:30 PM
            </p>
          )}
          <p className="text-brand-700">
            <strong>Where:</strong> {host.name}'s
            {location && ` — ${location}`}
          </p>
        </div>
      </div>
    </section>
  );
}
