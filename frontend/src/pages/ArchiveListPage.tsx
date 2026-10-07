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
              className="card flex items-center justify-between hover:border-brand-300 transition-colors"
            >
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
