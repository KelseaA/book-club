import type { BookResultsResponse } from "../types";

export default function BookResults({ data }: { data: BookResultsResponse }) {
  const top = data.results[0];

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        {data.totalBallots} ballot{data.totalBallots !== 1 ? "s" : ""} submitted
      </p>
      {data.results.map((book, i) => (
        <div
          key={book.id}
          className={`flex items-center gap-3 p-3 rounded-lg border ${book.id === top?.id ? "border-brand-300 bg-brand-50" : "bg-white border-gray-200"}`}
        >
          <span className="text-lg font-bold w-6 text-center shrink-0">
            {i + 1}
          </span>
          {book.coverImageUrl && (
            <img
              src={book.coverImageUrl}
              alt=""
              className="w-10 h-14 object-cover rounded shadow-sm shrink-0"
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
              <p className="font-medium text-sm truncate">{book.title}</p>
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
              <p className="text-xs text-gray-400 mt-0.5">{book.notes}</p>
            )}
          </div>
          <span className="text-sm font-semibold text-brand-600 whitespace-nowrap shrink-0">
            {book.bordaPoints} pts
          </span>
        </div>
      ))}
    </div>
  );
}
