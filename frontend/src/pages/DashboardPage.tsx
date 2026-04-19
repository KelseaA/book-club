import { useState } from "react";
import {
  useCurrentMonth,
  useMyVoteStatus,
  useBookResults,
  useDateResults,
  useDeleteBook,
  useDeleteDate,
  useSubmitBookVote,
  useSubmitDateVote,
} from "../hooks/useBookClub";
import { useAuth } from "../hooks/useAuth";
import MonthStatusBadge from "../components/MonthStatusBadge";
import HostSelector from "../components/HostSelector";
import BookProposalForm from "../components/BookProposalForm";
import DateProposalForm from "../components/DateProposalForm";
import RankedBookVote from "../components/RankedBookVote";
import DateAvailabilityVote from "../components/DateAvailabilityVote";
import BookResults from "../components/BookResults";
import DateResults from "../components/DateResults";
import FinalizeMonthButton from "../components/FinalizeMonthButton";
import type { BookOption, DateOption } from "../types";

type BookFormMode = "none" | "add" | "edit";
type DateFormMode = "none" | "add" | "edit";

function formatMonthKey(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function DashboardPage() {
  const { member } = useAuth();
  const { data: month, isLoading, error } = useCurrentMonth();
  const { data: voteStatus } = useMyVoteStatus(month?.monthKey ?? "");

  const [bookFormMode, setBookFormMode] = useState<BookFormMode>("none");
  const [editingBook, setEditingBook] = useState<BookOption | null>(null);
  const [dateFormMode, setDateFormMode] = useState<DateFormMode>("none");
  const [editingDate, setEditingDate] = useState<DateOption | null>(null);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<number | null>(
    null,
  );
  const [confirmDeleteDateId, setConfirmDeleteDateId] = useState<number | null>(
    null,
  );

  // Combined vote state
  const [bookRanks, setBookRanks] = useState<
    { bookOptionId: number; rank: number }[]
  >([]);
  const [selectedDateIds, setSelectedDateIds] = useState<number[]>([]);

  const deleteBook = useDeleteBook(month?.monthKey ?? "");
  const deleteDate = useDeleteDate(month?.monthKey ?? "");
  const submitBookVote = useSubmitBookVote(month?.monthKey ?? "");
  const submitDateVote = useSubmitDateVote(month?.monthKey ?? "");

  const canSeeResults = month
    ? month.resultsVisible || month.hostMemberId === member?.id
    : false;
  const { data: bookResultsData } = useBookResults(
    month?.monthKey ?? "",
    canSeeResults && !!month,
  );
  const { data: dateResultsData } = useDateResults(
    month?.monthKey ?? "",
    canSeeResults && !!month,
  );

  if (isLoading) return <p className="text-gray-400">Loading this month…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!month) return null;

  const isHost = member?.id === month.hostMemberId;
  const isFinalized = month.status === "FINALIZED";

  const isPendingVote = submitBookVote.isPending || submitDateVote.isPending;
  const voteError = submitBookVote.error || submitDateVote.error;

  function handleSubmitVotes() {
    // Submit book vote if not already submitted and there are books to rank
    if (!voteStatus?.hasSubmittedBookVote && month!.bookOptions.length > 0) {
      const ranks =
        bookRanks.length > 0
          ? bookRanks
          : month!.bookOptions.map((b, i) => ({
              bookOptionId: b.id,
              rank: i + 1,
            }));
      submitBookVote.mutate(ranks);
    }
    // Submit date vote if not already submitted
    if (!voteStatus?.hasSubmittedDateVote) {
      submitDateVote.mutate(selectedDateIds);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {formatMonthKey(month.monthKey)}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <MonthStatusBadge status={month.status} />
            {month.resultsVisible && !isFinalized && (
              <span className="text-xs text-green-700 font-medium">
                Results visible to all members
              </span>
            )}
          </div>
        </div>
        {/* Any member can change the host */}
        {!isFinalized && <HostSelector month={month} />}
      </div>

      {/* ── Book Proposals ──────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Book Proposals</h2>
          {isHost &&
            !isFinalized &&
            month.bookOptions.length < 5 &&
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
        {month.bookOptions.length === 0 && (
          <p className="text-gray-400 text-sm">No books proposed yet.</p>
        )}
        <div className="space-y-2">
          {month.bookOptions.map((book) => (
            <div key={book.id}>
              {editingBook?.id === book.id ? (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <BookProposalForm
                    monthKey={month.monthKey}
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
                        className="font-medium text-sm truncate text-brand-600 hover:underline block"
                      >
                        {book.title}
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
                  {isHost && !isFinalized && (
                    <div className="flex gap-2 shrink-0">
                      {confirmDeleteBookId === book.id ? (
                        <>
                          <button
                            className="text-xs text-red-600 font-medium hover:underline"
                            onClick={() => {
                              deleteBook.mutate(book.id);
                              setConfirmDeleteBookId(null);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            className="text-xs text-gray-500 hover:underline"
                            onClick={() => setConfirmDeleteBookId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
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
                            onClick={() => setConfirmDeleteBookId(book.id)}
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
              monthKey={month.monthKey}
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
            !isFinalized &&
            month.dateOptions.length < 4 &&
            dateFormMode === "none" && (
              <button
                className="btn-secondary text-sm"
                onClick={() => setDateFormMode("add")}
              >
                + Add Date
              </button>
            )}
        </div>

        {month.dateOptions.length === 0 && (
          <p className="text-gray-400 text-sm">No dates proposed yet.</p>
        )}
        <div className="space-y-2">
          {month.dateOptions.map((d) => (
            <div key={d.id}>
              {editingDate?.id === d.id ? (
                <div className="p-3 border rounded-lg bg-gray-50">
                  <DateProposalForm
                    monthKey={month.monthKey}
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
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {d.label && (
                      <p className="text-xs text-gray-400">{d.label}</p>
                    )}
                  </div>
                  {isHost && !isFinalized && (
                    <div className="flex gap-2">
                      {confirmDeleteDateId === d.id ? (
                        <>
                          <button
                            className="text-xs text-red-600 font-medium hover:underline"
                            onClick={() => {
                              deleteDate.mutate(d.id);
                              setConfirmDeleteDateId(null);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            className="text-xs text-gray-500 hover:underline"
                            onClick={() => setConfirmDeleteDateId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="text-xs text-brand-600 hover:underline"
                            onClick={() => setEditingDate(d)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => setConfirmDeleteDateId(d.id)}
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

        {dateFormMode === "add" && editingDate === null && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <DateProposalForm
              monthKey={month.monthKey}
              onDone={() => setDateFormMode("none")}
            />
          </div>
        )}
      </section>

      {/* ── Voting ────────────────────────────────────────────────────────── */}
      {!isFinalized && month.bookOptions.length > 0 && (
        <section className="card space-y-4">
          <h2 className="text-lg font-semibold">Your Vote</h2>

          {/* Book ballot */}
          {voteStatus?.hasSubmittedBookVote ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Book ballot submitted — ranked {voteStatus.bookVote?.ranks.length}{" "}
              book(s)
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Rank the books (drag to reorder):
              </p>
              <RankedBookVote
                monthKey={month.monthKey}
                books={month.bookOptions}
                onRanksChange={setBookRanks}
              />
            </div>
          )}

          {month.dateOptions.length > 0 && (
            <>
              <hr className="border-gray-200" />
              {voteStatus?.hasSubmittedDateVote ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  Date availability submitted
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Select dates you're available:
                  </p>
                  <DateAvailabilityVote
                    monthKey={month.monthKey}
                    dateOptions={month.dateOptions}
                    onSelectionChange={setSelectedDateIds}
                  />
                </div>
              )}
            </>
          )}

          {/* Combined submit */}
          {(!voteStatus?.hasSubmittedBookVote ||
            !voteStatus?.hasSubmittedDateVote) && (
            <div className="pt-2 space-y-2">
              <hr className="border-gray-200" />
              {voteError && (
                <p className="error-text">{(voteError as Error).message}</p>
              )}
              <button
                className="btn-primary w-full"
                onClick={handleSubmitVotes}
                disabled={isPendingVote || selectedDateIds.length === 0}
              >
                {isPendingVote ? "Submitting…" : "Submit Vote"}
              </button>
              {selectedDateIds.length === 0 && month.dateOptions.length > 0 && (
                <p className="text-xs text-gray-400 text-center">
                  Select at least one date to submit.
                </p>
              )}
              <p className="text-xs text-gray-400 text-center">
                Your vote is locked after submission and cannot be changed.
              </p>
            </div>
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
                Book Rankings (Borda Count)
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
          {isHost && !isFinalized && (
            <div className="pt-2 border-t border-gray-200">
              <FinalizeMonthButton month={month} />
            </div>
          )}
        </section>
      )}

      {/* Finalized banner */}
      {isFinalized && month.finalBookOption && (
        <section className="card border-brand-300 bg-brand-50">
          <h2 className="text-lg font-semibold text-brand-700 mb-3">
            Month Finalized!
          </h2>
          <p className="text-sm text-brand-600">
            <strong>Book:</strong> {month.finalBookOption.title} by{" "}
            {month.finalBookOption.author}
          </p>
          {month.finalMeetingDate && (
            <p className="text-sm text-brand-600 mt-1">
              <strong>Meeting:</strong>{" "}
              {new Date(month.finalMeetingDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
