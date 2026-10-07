import { useState } from "react";
import {
  useFinalizeMeeting,
  useBookResults,
  useDateResults,
} from "../hooks/useBookClub";
import type { Meeting } from "../types";

interface Props {
  meeting: Meeting;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Lets the host finalize the meeting.
 * Detects ties and requires manual tie-break selection.
 */
export default function FinalizeMeetingButton({ meeting }: Props) {
  const [open, setOpen] = useState(false);
  const [finalBookId, setFinalBookId] = useState<number | "">("");
  const [finalDate, setFinalDate] = useState<string>("");

  const finalize = useFinalizeMeeting(meeting.id);
  const booksQuery = useBookResults(meeting.id, open);
  const datesQuery = useDateResults(meeting.id, open);

  if (meeting.status === "FINALIZED") {
    return (
      <div className="text-sm text-green-700 font-medium space-y-1">
        <p>Meeting finalized</p>
        {meeting.finalBookOption && (
          <p>
            Winner: <strong>{meeting.finalBookOption.title}</strong>
          </p>
        )}
        {meeting.meetingDate && <p>Meeting: {fmt(meeting.meetingDate)}</p>}
      </div>
    );
  }

  return (
    <div>
      <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
        Announce Winner
      </button>

      {open && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-4">
          {booksQuery.isLoading || datesQuery.isLoading ? (
            <p className="text-sm text-gray-500">Loading results…</p>
          ) : (
            <>
              <div>
                <label className="label">Winning Book</label>
                <select
                  className="input"
                  value={finalBookId}
                  onChange={(e) => setFinalBookId(Number(e.target.value))}
                >
                  <option value="">— select —</option>
                  {(booksQuery.data?.results ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.bordaPoints} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Meeting Date</label>
                <select
                  className="input"
                  value={finalDate}
                  onChange={(e) => setFinalDate(e.target.value)}
                >
                  <option value="">— select —</option>
                  {(datesQuery.data?.results ?? []).map((d) => (
                    <option key={d.id} value={d.date}>
                      {fmt(d.date)} ({d.count} available)
                    </option>
                  ))}
                </select>
              </div>

              {finalize.isError && (
                <p className="error-text">{finalize.error.message}</p>
              )}

              <button
                className="btn-primary w-full"
                disabled={!finalBookId || !finalDate || finalize.isPending}
                onClick={() =>
                  finalize.mutate({
                    finalBookOptionId: Number(finalBookId),
                    meetingDate: finalDate,
                  })
                }
              >
                {finalize.isPending ? "Saving…" : "Confirm & Announce Winner"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
