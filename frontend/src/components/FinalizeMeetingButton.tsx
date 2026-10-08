import { useState } from "react";
import {
  useFinalizeMeeting,
  useBookResults,
  useDateResults,
} from "../hooks/useBookClub";
import { formatMeetingDate } from "../lib/meetings";
import type { Meeting } from "../types";

interface Props {
  meeting: Meeting;
}

interface Option {
  id: number;
  label: string;
}

/**
 * One category of the winner (book or date). With a single leader it just
 * shows the winner; with a tie the host picks one of the tied options.
 */
function WinnerPicker({
  title,
  leaders,
  scoreLabel,
  value,
  onChange,
}: {
  title: string;
  leaders: Option[];
  scoreLabel: string;
  value: number | null;
  onChange: (id: number) => void;
}) {
  if (leaders.length === 1) {
    return (
      <div>
        <p className="label">{title}</p>
        <p className="text-sm">
          <strong>{leaders[0].label}</strong>{" "}
          <span className="text-gray-500">({scoreLabel})</span>
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="label">{title}</p>
      <p className="text-sm text-amber-700 mb-2">
        It's a {leaders.length}-way tie ({scoreLabel} each) — you choose:
      </p>
      <div className="space-y-1">
        {leaders.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              className="accent-brand-500"
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Lets the host finalize the meeting. The winners come from the votes (top
 * Borda score, most-available date); the host only chooses when there's a
 * tie. The backend re-checks all of this when finalizing.
 */
export default function FinalizeMeetingButton({ meeting }: Props) {
  const [open, setOpen] = useState(false);
  const [bookTieBreakId, setBookTieBreakId] = useState<number | null>(null);
  const [dateTieBreakId, setDateTieBreakId] = useState<number | null>(null);

  const finalize = useFinalizeMeeting(meeting.id);
  const booksQuery = useBookResults(meeting.id, open);
  const datesQuery = useDateResults(meeting.id, open);

  const books = booksQuery.data;
  const dates = datesQuery.data;

  const bookLeaders: Option[] = (books?.results ?? [])
    .filter((b) => books!.leaderIds.includes(b.id))
    .map((b) => ({ id: b.id, label: b.title }));
  const dateLeaders: Option[] = (dates?.results ?? [])
    .filter((d) => dates!.leaderIds.includes(d.id))
    .map((d) => ({ id: d.id, label: formatMeetingDate(d.date, "long") }));

  const bookTied = bookLeaders.length > 1;
  const dateTied = dateLeaders.length > 1;
  const ready =
    bookLeaders.length > 0 &&
    dateLeaders.length > 0 &&
    (!bookTied || bookTieBreakId !== null) &&
    (!dateTied || dateTieBreakId !== null);

  function handleConfirm() {
    finalize.mutate({
      bookTieBreakId: bookTied ? bookTieBreakId! : undefined,
      dateTieBreakId: dateTied ? dateTieBreakId! : undefined,
    });
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
              {books?.totalBallots === 0 && (
                <p className="text-sm text-amber-700">
                  No one has voted yet, so everything is tied.
                </p>
              )}

              <WinnerPicker
                title="Winning book"
                leaders={bookLeaders}
                scoreLabel={`${books?.results[0]?.bordaPoints ?? 0} pts`}
                value={bookTieBreakId}
                onChange={setBookTieBreakId}
              />
              <WinnerPicker
                title="Meeting date"
                leaders={dateLeaders}
                scoreLabel={`${dates?.results[0]?.count ?? 0} available`}
                value={dateTieBreakId}
                onChange={setDateTieBreakId}
              />

              <p className="text-xs text-gray-500">
                This locks the meeting and shows the results to everyone.
              </p>

              {finalize.isError && (
                <p className="error-text">{finalize.error.message}</p>
              )}

              <button
                className="btn-primary w-full"
                disabled={!ready || finalize.isPending}
                onClick={handleConfirm}
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
