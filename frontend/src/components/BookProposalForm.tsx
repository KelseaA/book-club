import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAddBook, useUpdateBook } from "../hooks/useBookClub";
import type { BookOption } from "../types";

interface FormValues {
  title: string;
  author: string;
  notes: string;
  genres: string;
  coverImageUrl: string;
  sourceUrl: string;
}

interface OpenLibraryResult {
  id: string;
  title: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  amazonUrl?: string;
  workKey?: string;
}

async function searchOpenLibrary(query: string): Promise<OpenLibraryResult[]> {
  const res = await fetch(
    `/api/metadata/books-search?q=${encodeURIComponent(query)}`,
    {
      credentials: "include",
    },
  );
  if (!res.ok) return [];
  return res.json();
}

async function fetchWorkSubjects(
  workKey: string,
): Promise<string[] | undefined> {
  const res = await fetch(
    `/api/metadata/book-detail?key=${encodeURIComponent(workKey)}`,
    { credentials: "include" },
  );
  if (!res.ok) return undefined;
  const data: { subjects?: string[] } = await res.json();
  return data.subjects;
}

interface Props {
  monthKey: string;
  book?: BookOption;
  onDone: () => void;
}

export default function BookProposalForm({ monthKey, book, onDone }: Props) {
  const isEdit = !!book;
  const add = useAddBook(monthKey);
  const update = useUpdateBook(monthKey, book?.id ?? 0);
  const mutation = isEdit ? update : add;

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<OpenLibraryResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [applyingDetail, setApplyingDetail] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: book?.title ?? "",
      author: book?.author ?? "",
      notes: book?.notes ?? "",
      genres: book?.genres ?? "",
      coverImageUrl: book?.coverImageUrl ?? "",
      sourceUrl: book?.sourceUrl ?? "",
    },
  });

  const titleValue = watch("title");

  useEffect(() => {
    if (isEdit) return;
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!titleValue || titleValue.trim().length < 3) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setResults([]);
      try {
        const found = await searchOpenLibrary(titleValue.trim());
        setResults(found);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [titleValue, isEdit]);

  async function applyResult(r: OpenLibraryResult) {
    justSelectedRef.current = true;
    // Clear all fields first so stale data from a previous selection doesn't linger
    setValue("title", r.title, { shouldValidate: true });
    setValue("author", r.authors.join(", "), { shouldValidate: true });
    setValue("coverImageUrl", r.coverUrl ?? "");
    setValue("sourceUrl", r.amazonUrl ?? "");
    setValue("notes", "");
    setValue("genres", "");
    setResults([]);
    setSearched(false);

    // Lazily fetch subjects from Works API
    if (r.workKey) {
      setApplyingDetail(true);
      try {
        const subjects = await fetchWorkSubjects(r.workKey);
        if (subjects && subjects.length > 0)
          setValue("genres", subjects.join(", "));
      } finally {
        setApplyingDetail(false);
      }
    }
  }

  function onSubmit(values: FormValues) {
    const payload = {
      title: values.title,
      author: values.author,
      notes: values.notes || undefined,
      genres: values.genres || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      sourceUrl: values.sourceUrl || undefined,
    };
    mutation.mutate(payload as Parameters<typeof mutation.mutate>[0], {
      onSuccess: onDone,
    });
  }

  const coverPreview = watch("coverImageUrl");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title + search */}
      <div>
        <label className="label">Title *</label>
        <div className="relative">
          <div className="flex items-center">
            <input
              className="input flex-1"
              placeholder="Start typing to search…"
              {...register("title", { required: "Title is required" })}
            />
            {searching && (
              <svg
                style={{ animation: "spin 0.8s linear infinite" }}
                className="shrink-0 ml-2 w-5 h-5 text-brand-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
          </div>

          {results.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 border border-gray-200 rounded-lg shadow-md bg-white divide-y divide-gray-100 overflow-hidden max-h-72 overflow-y-auto">
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                  onClick={() => applyResult(r)}
                >
                  {r.coverUrl ? (
                    <img
                      src={r.coverUrl}
                      alt=""
                      className="w-8 h-11 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-11 bg-gray-100 rounded shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {r.authors.join(", ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.title && <p className="error-text">{errors.title.message}</p>}
        {searched && results.length === 0 && !searching && (
          <p className="text-xs text-gray-400 mt-1">
            No results found — fill in the details below manually.
          </p>
        )}
      </div>

      <div>
        <label className="label">Author *</label>
        <input
          className="input"
          {...register("author", { required: "Author is required" })}
        />
        {errors.author && <p className="error-text">{errors.author.message}</p>}
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} {...register("notes")} />
      </div>

      <div>
        <label className="label">Genres</label>
        {applyingDetail ? (
          <div className="input flex items-center gap-2 text-gray-500 text-sm bg-gray-50">
            <svg
              style={{ animation: "spin 0.8s linear infinite" }}
              className="w-4 h-4 shrink-0 text-brand-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Fetching genres…
          </div>
        ) : (
          <input
            className="input"
            placeholder="e.g. Science Fiction, Dystopian"
            {...register("genres")}
          />
        )}
        {watch("genres") && !applyingDetail && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {watch("genres")
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean)
              .map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full"
                >
                  {g}
                </span>
              ))}
          </div>
        )}
      </div>

      <div>
        <label className="label">Amazon / Source Link</label>
        <input
          className="input"
          type="url"
          {...register("sourceUrl")}
          placeholder="https://…"
        />
      </div>

      <div>
        <label className="label">Cover Image URL</label>
        <div className="flex gap-3 items-start">
          <input
            className="input flex-1"
            type="url"
            {...register("coverImageUrl")}
            placeholder="https://…"
          />
          {coverPreview && (
            <img
              src={coverPreview}
              alt="cover preview"
              className="w-10 h-14 object-cover rounded shadow-sm shrink-0"
            />
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className="error-text">{mutation.error.message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Saving…"
            : isEdit
              ? "Save Changes"
              : "Add Book"}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
