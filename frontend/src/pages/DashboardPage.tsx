import { useCurrentMeetings, useStartMeeting } from "../hooks/useBookClub";
import UpcomingMeeting from "../components/UpcomingMeeting";
import ActiveMeeting from "../components/ActiveMeeting";

export default function DashboardPage() {
  const { data, isLoading, error } = useCurrentMeetings();
  const startMeeting = useStartMeeting();

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-12">
      {data.upcoming.map((meeting) => (
        <UpcomingMeeting key={meeting.id} meeting={meeting} />
      ))}

      {data.active ? (
        <ActiveMeeting meeting={data.active} />
      ) : (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold">
            {data.upcoming.length > 0
              ? "What's after that?"
              : "No meeting planned yet"}
          </h2>
          <p className="text-sm text-gray-500">
            Anyone can start planning the next meeting. You'll be the host to
            begin with — you can hand it to someone else afterwards.
          </p>
          {startMeeting.isError && (
            <p className="error-text">{startMeeting.error.message}</p>
          )}
          <button
            className="btn-primary"
            onClick={() => startMeeting.mutate(undefined)}
            disabled={startMeeting.isPending}
          >
            {startMeeting.isPending
              ? "Starting…"
              : "Start planning the next meeting"}
          </button>
        </section>
      )}
    </div>
  );
}
