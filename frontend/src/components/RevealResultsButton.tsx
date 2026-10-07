import { useRevealResults } from "../hooks/useBookClub";
import type { Meeting } from "../types";

export default function RevealResultsButton({ meeting }: { meeting: Meeting }) {
  const reveal = useRevealResults(meeting.id);

  if (meeting.resultsVisible) {
    return (
      <p className="text-sm text-green-700 font-medium">
        ✓ Results revealed{" "}
        {meeting.revealedAt
          ? `on ${new Date(meeting.revealedAt).toLocaleDateString()}`
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
