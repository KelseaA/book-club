import { Link } from "react-router-dom";
import { useMeetings } from "../hooks/useBookClub";
import { formatMeetingDate, meetingTitle } from "../lib/meetings";

export default function ArchiveListPage() {
  const { data: meetings, isLoading, error } = useMeetings();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Archive</h1>
      {!meetings?.length ? (
        <p className="text-gray-400">No past meetings yet.</p>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/archive/${meeting.id}`}
              className="group card flex items-center gap-4 hover:border-brand-300 transition-colors"
            >
              {/* Placeholder keeps rows aligned when a book has no cover */}
              {meeting.finalBookOption?.coverImageUrl ? (
                <img
                  src={meeting.finalBookOption.coverImageUrl}
                  alt=""
                  className="w-12 h-16 object-cover rounded shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-16 rounded bg-gray-100 shrink-0" />
              )}
              <div>
                <p className="font-semibold">{meetingTitle(meeting)}</p>
                {meeting.finalBookOption && (
                  <p className="text-sm text-gray-500">
                    {meeting.finalBookOption.author}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {meeting.meetingDate &&
                    `${formatMeetingDate(meeting.meetingDate, "short")} · `}
                  Hosted by {meeting.host.name}
                </p>
              </div>
              {/* Visible cue that the row opens more detail, even without hover */}
              <span className="ml-auto shrink-0 text-sm font-medium text-brand-600 group-hover:underline">
                See rankings →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
