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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/archive" className="text-brand-600 hover:underline text-sm">
          ← Archive
        </Link>
      </div>

      {/* One header for the meeting — it's titled by the winning book, so the
          book itself doesn't need its own card */}
      <div className="card flex items-start gap-5">
        {meeting.finalBookOption?.coverImageUrl && (
          <img
            src={meeting.finalBookOption.coverImageUrl}
            alt=""
            className="w-20 h-28 object-cover rounded-md shadow-sm shrink-0"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{meetingTitle(meeting)}</h1>
          {meeting.finalBookOption && (
            <p className="text-gray-600">{meeting.finalBookOption.author}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            {meeting.meetingDate &&
              `${formatMeetingDate(meeting.meetingDate, "short")} · `}
            Hosted by {meeting.host.name}
          </p>
          {/* Host address intentionally omitted per archive requirements */}
        </div>
      </div>

      {bookResultsData && (
        <div className="card">
          <h2 className="font-semibold mb-3">How we ranked them</h2>
          <BookResults
            data={bookResultsData}
            winnerId={meeting.finalBookOptionId}
          />
        </div>
      )}

      {/* Note: proposed dates and date vote results intentionally omitted per archive requirements */}
    </div>
  );
}
