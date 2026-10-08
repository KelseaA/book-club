import type { DateResultsResponse } from "../types";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DateResults({ data }: { data: DateResultsResponse }) {
  // Highlight every date tied for most available, not just the first row
  const leaders = new Set(data.leaderIds);

  return (
    <div className="space-y-2">
      {data.results.map((d) => (
        <div
          key={d.id}
          className={`p-3 rounded-lg border ${leaders.has(d.id) ? "border-brand-300 bg-brand-50" : "bg-white border-gray-200"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{fmt(d.date)}</span>
            <span className="text-sm font-semibold text-brand-600">
              {d.count} available
            </span>
          </div>
          {d.availableMembers.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {d.availableMembers.map((m) => m.name).join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
