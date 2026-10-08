import { useState } from "react";
import {
  useMyVoteStatus,
  useBookResults,
  useDateResults,
  useDeleteBook,
  useDeleteDate,
  useSubmitVote,
  useOpenVoting,
} from "../hooks/useBookClub";
import { useAuth } from "../hooks/useAuth";
import MeetingStatusBadge from "./MeetingStatusBadge";
import HostSelector from "./HostSelector";
import BookProposalForm from "./BookProposalForm";
import DateProposalForm from "./DateProposalForm";
import RankedBookVote from "./RankedBookVote";
import DateAvailabilityVote from "./DateAvailabilityVote";
import BookResults from "./BookResults";
import DateResults from "./DateResults";
import FinalizeMeetingButton from "./FinalizeMeetingButton";
import type { BookOption, DateOption, Meeting } from "../types";

type BookFormMode = "none" | "add" | "edit";
type DateFormMode = "none" | "add" | "edit";

/**
 * The meeting currently being planned or voted on: proposals, voting, and
 * (for the host) live results.
 */
export default function ActiveMeeting({ meeting }: { meeting: Meeting }) {
  const { member } = useAuth();
  const { data: voteStatus } = useMyVoteStatus(meeting.id);

  const [bookFormMode, setBookFormMode] = useState<BookFormMode>("none");
  const [editingBook, setEditingBook] = useState<BookOption | null>(null);
  const [dateFormMode, setDateFormMode] = useState<DateFormMode>("none");
  const [editingDate, setEditingDate] = useState<DateOption | null>(null);

  // Combined vote state
  const [bookRanks, setBookRanks] = useState<
    { bookOptionId: number; rank: number }[]
  >([]);
  const [selectedDateIds, setSelectedDateIds] = useState<number[]>([]);

  const deleteBook = useDeleteBook(meeting.id);
  const deleteDate = useDeleteDate(meeting.id);
  const submitVote = useSubmitVote(meeting.id);
  const openVotingMutation = useOpenVoting(meeting.id);

  // Results stay with the host until the meeting is finalized, so members who
  // haven't voted yet aren't swayed by the standings
  const canSeeResults = meeting.hostMemberId === member?.id;
  const { data: bookResultsData } = useBookResults(meeting.id, canSeeResults);
  const { data: dateResultsData } = useDateResults(meeting.id, canSeeResults);

  const isHost = member?.id === meeting.hostMemberId;
  const isSetup = meeting.status === "SETUP";
  const hasVotes = meeting._count.bookVotes > 0;
  const canSeeOptions = isHost || !isSetup;
  // The backend requires both, since finalizing picks a winning book and date
  const readyToOpen =
    meeting.bookOptions.length > 0 && meeting.dateOptions.length > 0;

  function handleSubmitVote() {
    // If the member never dragged anything, the displayed order is their ballot
    const ranks =
      bookRanks.length > 0
        ? bookRanks
        : meeting.bookOptions.map((b, i) => ({
            bookOptionId: b.id,
            rank: i + 1,
          }));
    submitVote.mutate({ ranks, dateOptionIds: selectedDateIds });
  }

  return (
    <div className="space-y-6">
      {/* Header — kept modest so the upcoming meeting above has the focus */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-800">
              Planning the next one
            </h2>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          {isSetup && !isHost && (
            <p className="text-sm text-gray-500 mt-1">
              The host is putting together the book and date options. You'll see
              them when voting opens.
            </p>
          )}
        </div>
        {/* Any member can change the host */}
        <HostSelector meeting={meeting} />
      </div>

      {/* During setup only the host sees the draft options (the API hides them too) */}
      {canSeeOptions && (
        <>
          {/* ── Book Proposals ──────────────────────────────────────────────────── */}
          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Book Proposals</h2>
              {isHost &&
                !hasVotes &&
                meeting.bookOptions.length < 5 &&
                bookFormMode === "none" && (
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => setBookFormMode("add")}
                  >
                    + Add Book
                  </button>
                )}
            </div>

            {/* Existing books */}
            {meeting.bookOptions.length === 0 && (
              <p className="text-gray-400 text-sm">No books proposed yet.</p>
            )}
            <div className="space-y-2">
              {meeting.bookOptions.map((book) => (
                <div key={book.id}>
                  {editingBook?.id === book.id ? (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <BookProposalForm
                        meetingId={meeting.id}
                        book={book}
                        onDone={() => setEditingBook(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {book.coverImageUrl && (
                        <img
                          src={book.coverImageUrl}
                          alt=""
                          className="w-10 h-14 object-cover rounded shadow-sm"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        {book.sourceUrl ? (
                          <a
                            href={book.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-sm truncate text-gray-900 hover:text-brand-600 hover:underline block"
                          >
                            {book.title}
                            {/* Normal text color so it doesn't look like a visited link; the arrow marks an outside page */}
                            <span
                              aria-hidden="true"
                              className="text-gray-400 ml-1"
                            >
                              ↗
                            </span>
                            <span className="sr-only">
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          <p className="font-medium text-sm truncate">
                            {book.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">{book.author}</p>
                        {book.genres && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {book.genres
                              .split(",")
                              .map((g) => g.trim())
                              .filter(Boolean)
                              .map((g) => (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full"
                                >
                                  {g}
                                </span>
                              ))}
                          </div>
                        )}
                        {book.notes && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {book.notes}
                          </p>
                        )}
                      </div>
                      {isHost && (
                        <div className="flex gap-2 shrink-0">
                          {/* Proposals are host-only drafts, so removing one needs no confirm step */}
                          {!hasVotes && (
                            <>
                              <button
                                className="text-xs text-brand-600 hover:underline"
                                onClick={() => {
                                  setEditingBook(book);
                                  setBookFormMode("none");
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="text-xs text-red-500 hover:underline"
                                onClick={() => deleteBook.mutate(book.id)}
                                disabled={deleteBook.isPending}
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add book form */}
            {bookFormMode === "add" && editingBook === null && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <BookProposalForm
                  meetingId={meeting.id}
                  onDone={() => setBookFormMode("none")}
                />
              </div>
            )}
          </section>

          {/* ── Date Proposals ──────────────────────────────────────────────────── */}
          <section className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Meeting Dates</h2>
              {isHost &&
                !hasVotes &&
                meeting.dateOptions.length < 4 &&
                dateFormMode === "none" && (
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => setDateFormMode("add")}
                  >
                    + Add Date
                  </button>
                )}
            </div>

            {meeting.dateOptions.length === 0 && (
              <p className="text-gray-400 text-sm">No dates proposed yet.</p>
            )}
            <div className="space-y-2">
              {meeting.dateOptions.map((d) => (
                <div key={d.id}>
                  {editingDate?.id === d.id ? (
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <DateProposalForm
                        meetingId={meeting.id}
                        dateOption={d}
                        onDone={() => setEditingDate(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(d.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      {isHost && !hasVotes && (
                        <div className="flex gap-2">
                          <button
                            className="text-xs text-brand-600 hover:underline"
                            onClick={() => setEditingDate(d)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => deleteDate.mutate(d.id)}
                            disabled={deleteDate.isPending}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {dateFormMode === "add" && editingDate === null && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <DateProposalForm
                  meetingId={meeting.id}
                  onDone={() => setDateFormMode("none")}
                />
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Open Voting trigger (SETUP phase, host only) — last step, so it sits below the options */}
      {isSetup && isHost && (
        <section className="card space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Open Voting</h2>
            <p className="text-sm text-gray-500 mt-1">
              Once you're happy with the book proposals and dates, open voting
              so all members can submit their ballots.
            </p>
          </div>
          {openVotingMutation.error && (
            <p className="error-text">
              {(openVotingMutation.error as Error).message}
            </p>
          )}
          <button
            className="btn-primary"
            onClick={() => openVotingMutation.mutate(undefined)}
            disabled={!readyToOpen || openVotingMutation.isPending}
          >
            {openVotingMutation.isPending
              ? "Opening…"
              : "Open Voting for All Members"}
          </button>
          {!readyToOpen && (
            <p className="text-xs text-gray-500">
              Add at least one book and one date first.
            </p>
          )}
        </section>
      )}

      {/* ── Voting ────────────────────────────────────────────────────────── */}
      {!isSetup && meeting.bookOptions.length > 0 && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Your Vote</h2>

          {!voteStatus ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : voteStatus.hasVoted ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Vote submitted — thanks! Votes are locked once submitted.
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Rank the books (drag to reorder):
                </p>
                <RankedBookVote
                  meetingId={meeting.id}
                  books={meeting.bookOptions}
                  onRanksChange={setBookRanks}
                />
              </div>

              {meeting.dateOptions.length > 0 && (
                <>
                  <hr className="border-gray-200" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Select dates you're available:
                    </p>
                    <DateAvailabilityVote
                      meetingId={meeting.id}
                      dateOptions={meeting.dateOptions}
                      onSelectionChange={setSelectedDateIds}
                    />
                  </div>
                </>
              )}

              <div className="pt-2 space-y-2">
                <hr className="border-gray-200" />
                {submitVote.error && (
                  <p className="error-text">{submitVote.error.message}</p>
                )}
                <button
                  className="btn-primary w-full"
                  onClick={handleSubmitVote}
                  disabled={submitVote.isPending}
                >
                  {submitVote.isPending ? "Submitting…" : "Submit Vote"}
                </button>
                {selectedDateIds.length === 0 &&
                  meeting.dateOptions.length > 0 && (
                    <p className="text-xs text-gray-400 text-center">
                      No dates selected — that tells the host none of them work
                      for you.
                    </p>
                  )}
                <p className="text-xs text-gray-400 text-center">
                  Your vote is locked after submission and cannot be changed.
                </p>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {canSeeResults && (bookResultsData || dateResultsData) && (
        <section className="card space-y-6">
          <h2 className="text-lg font-semibold">Results</h2>
          {bookResultsData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Book Rankings
              </h3>
              <BookResults data={bookResultsData} />
            </div>
          )}
          {dateResultsData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Date Availability
              </h3>
              <DateResults data={dateResultsData} />
            </div>
          )}
          {isHost && (
            <div className="pt-2 border-t border-gray-200 space-y-4">
              <FinalizeMeetingButton meeting={meeting} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
