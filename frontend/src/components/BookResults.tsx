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
          <span className="text-lg font-bold w-6 text-center">{i + 1}</span>
          {book.coverImageUrl && (
            <img
              src={book.coverImageUrl}
              alt=""
              className="w-8 h-12 object-cover rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{book.title}</p>
            <p className="text-xs text-gray-500">{book.author}</p>
          </div>
          <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">
            {book.bordaPoints} pts
          </span>
        </div>
      ))}
    </div>
  );
}
