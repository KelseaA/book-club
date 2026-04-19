import { useRevealResults } from "../hooks/useBookClub";
import type { BookClubMonth } from "../types";

export default function RevealResultsButton({
  month,
}: {
  month: BookClubMonth;
}) {
  const reveal = useRevealResults(month.monthKey);

  if (month.resultsVisible) {
    return (
      <p className="text-sm text-green-700 font-medium">
        ✓ Results revealed{" "}
        {month.revealedAt
          ? `on ${new Date(month.revealedAt).toLocaleDateString()}`
          : ""}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        className="btn-primary"
        onClick={() => reveal.mutate(undefined)}
        disabled={reveal.isPending}
      >
        {reveal.isPending ? "Revealing…" : "👁 Reveal Results to Everyone"}
      </button>
      <p className="text-xs text-gray-400">
        This will show all vote results to all members.
      </p>
      {reveal.isError && <p className="error-text">{reveal.error.message}</p>}
    </div>
  );
}
