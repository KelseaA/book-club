import { useParams, Link } from "react-router-dom";
import { useMonth } from "../hooks/useBookClub";
import { useBookResults } from "../hooks/useBookClub";
import BookResults from "../components/BookResults";

function formatMonthKey(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function ArchiveDetailPage() {
  const { monthKey = "" } = useParams<{ monthKey: string }>();
  const { data: month, isLoading, error } = useMonth(monthKey);
  const { data: bookResultsData } = useBookResults(
    monthKey,
    !!month?.resultsVisible,
  );

  if (isLoading) return <p className="text-gray-400">Loading…</p>;
  if (error) return <p className="error-text">{(error as Error).message}</p>;
  if (!month) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Link to="/archive" className="text-brand-600 hover:underline text-sm">
          ← Archive
        </Link>
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold">{formatMonthKey(month.monthKey)}</h1>
        <p className="text-gray-500 mt-1">
          Host: <strong>{month.host.name}</strong>
        </p>
        {/* Note: host address intentionally omitted per archive requirements */}
      </div>

      {/* Winning book */}
      {month.finalBookOption && (
        <div className="card border-brand-300 bg-brand-50">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-2">
            Book of the Month
          </p>
          <div className="flex items-center gap-4">
            {month.finalBookOption.coverImageUrl && (
              <img
                src={month.finalBookOption.coverImageUrl}
                alt=""
                className="w-12 h-18 object-cover rounded"
              />
            )}
            <div>
              <p className="text-xl font-bold">{month.finalBookOption.title}</p>
              <p className="text-gray-500">{month.finalBookOption.author}</p>
              {month.finalBookOption.notes && (
                <p className="text-sm text-gray-400 mt-1">
                  {month.finalBookOption.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All proposals */}
      <div className="card">
        <h2 className="font-semibold mb-3">All Proposed Books</h2>
        <div className="space-y-2">
          {month.bookOptions.map((b) => (
            <div
              key={b.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${b.id === month.finalBookOptionId ? "bg-brand-50 border border-brand-200" : "bg-gray-50"}`}
            >
              {b.coverImageUrl && (
                <img
                  src={b.coverImageUrl}
                  alt=""
                  className="w-8 h-12 object-cover rounded"
                />
              )}
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-gray-500">{b.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book rankings */}
      {bookResultsData && (
        <div className="card">
          <h2 className="font-semibold mb-3">Final Book Rankings</h2>
          <BookResults data={bookResultsData} />
        </div>
      )}

      {/* Note: meeting dates, date vote results, and final meeting date intentionally omitted per archive requirements */}
    </div>
  );
}
