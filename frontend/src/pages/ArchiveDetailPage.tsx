import { useParams, Link } from "react-router-dom";
import { useMeeting, useBookResults } from "../hooks/useBookClub";
import { formatMeetingDate, meetingTitle } from "../lib/meetings";
import BookResults from "../components/BookResults";

export default function ArchiveDetailPage() {
  const meetingId = Number(useParams<{ meetingId: string }>().meetingId);
  const { data: meeting, isLoading, error } = useMeeting(meetingId);
  const { data: bookResultsData } = useBookResults(
    meetingId,
    !!meeting?.resultsVisible,
  );

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!meeting) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/archive" className="text-brand-600 hover:underline text-sm">
          ← Archive
        </Link>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold">{meetingTitle(meeting)}</h1>
        <p className="text-gray-500 mt-1">
          {meeting.meetingDate &&
            `${formatMeetingDate(meeting.meetingDate, "short")} · `}
          Hosted by <strong>{meeting.host.name}</strong>
        </p>
        {/* Note: host address intentionally omitted per archive requirements */}
      </div>

      {/* Winning book */}
      {meeting.finalBookOption && (
        <div className="card border-brand-300 bg-brand-50">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
            Our Pick
          </p>
          <div className="flex items-center gap-4">
            {meeting.finalBookOption.coverImageUrl && (
              <img
                src={meeting.finalBookOption.coverImageUrl}
                alt=""
                className="w-12 h-18 object-cover rounded"
              />
            )}
            <div>
              <p className="text-xl font-bold">
                {meeting.finalBookOption.title}
              </p>
              <p className="text-gray-500">{meeting.finalBookOption.author}</p>
              {meeting.finalBookOption.notes && (
                <p className="text-sm text-gray-400 mt-1">
                  {meeting.finalBookOption.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Book rankings */}
      {bookResultsData && (
        <div className="card">
          <h2 className="font-semibold mb-3">Final Book Rankings</h2>
          <BookResults data={bookResultsData} />
        </div>
      )}

      {/* Note: proposed dates and date vote results intentionally omitted per archive requirements */}
    </div>
  );
}
