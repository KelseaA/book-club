import { useState } from "react";
import { useFetchMetadata } from "../hooks/useBookClub";
import BookProposalForm from "./BookProposalForm";

interface Props {
  monthKey: string;
  onDone: () => void;
}

/**
 * Two-step form:
 *  1. Paste URL → fetch metadata (best-effort)
 *  2. Edit prefilled fields → submit
 */
export default function BookLinkImportForm({ monthKey, onDone }: Props) {
  const [url, setUrl] = useState("");
  const [prefill, setPrefill] = useState<{
    title?: string;
    author?: string;
    coverImageUrl?: string;
    sourceUrl?: string;
  } | null>(null);
  const fetchMetadata = useFetchMetadata();

  async function handleFetch() {
    if (!url) return;
    fetchMetadata.mutate(url, {
      onSuccess: (data) => setPrefill(data),
      onError: () => {
        // Partial fetch failed — allow manual entry with the URL pre-filled
        setPrefill({ sourceUrl: url });
      },
    });
  }

  if (prefill) {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-3">
          Review and edit the imported details before saving.
        </p>
        <BookProposalForm
          monthKey={monthKey}
          prefill={prefill}
          onDone={onDone}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="label">
        Paste a book URL (Goodreads, Bookshop, etc.)
      </label>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          type="url"
          placeholder="https://www.goodreads.com/book/show/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
        />
        <button
          type="button"
          className="btn-primary whitespace-nowrap"
          onClick={handleFetch}
          disabled={!url || fetchMetadata.isPending}
        >
          {fetchMetadata.isPending ? "Fetching…" : "Fetch"}
        </button>
      </div>
      {fetchMetadata.isError && (
        <p className="error-text">
          Could not fetch metadata. You can enter details manually.
        </p>
      )}
      <button
        type="button"
        className="text-sm text-brand-600 hover:underline"
        onClick={() => setPrefill({})}
      >
        Skip — enter manually instead
      </button>
    </div>
  );
}
