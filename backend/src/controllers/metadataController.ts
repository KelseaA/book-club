import { Request, Response } from "express";
import fetch from "node-fetch";

/** GET /api/metadata/books-search?q=... — proxies Open Library search API */
export async function searchBooks(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) return res.json([]);

  try {
    const apiRes = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(q)}&limit=10&fields=key,title,author_name,cover_i,first_publish_year`,
    );
    if (!apiRes.ok) return res.json([]);
    const json = (await apiRes.json()) as { docs?: Record<string, unknown>[] };
    if (!json.docs) return res.json([]);

    const qLower = q.toLowerCase();
    const results = json.docs.map((doc) => {
      const coverId = doc.cover_i as number | undefined;
      const coverUrl = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
        : undefined;
      const title = (doc.title as string) ?? "";
      // Use a title+author search URL — more reliable than a specific /dp/ISBN
      // since Open Library returns ISBNs for all editions, not just the cover edition
      const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(
        [title, ((doc.author_name as string[]) ?? [])[0] ?? ""]
          .join(" ")
          .trim(),
      )}`;
      const tLower = title.toLowerCase();
      const score = tLower === qLower ? 0 : tLower.startsWith(qLower) ? 1 : 2;
      return {
        id: (doc.key as string) ?? String(Math.random()),
        title,
        authors: (doc.author_name as string[]) ?? [],
        coverUrl,
        amazonUrl,
        workKey: (doc.key as string) ?? undefined,
        _score: score,
      };
    });

    results.sort((a, b) => a._score - b._score);
    const clean = results.slice(0, 5).map(({ _score: _s, ...r }) => r);
    return res.json(clean);
  } catch {
    return res.json([]);
  }
}

/** GET /api/metadata/book-detail?key=/works/OL... — fetches description from Open Library Works API */
export async function fetchBookDetail(req: Request, res: Response) {
  const key = (req.query.key as string | undefined)?.trim();
  if (!key) return res.json({});

  try {
    const apiRes = await fetch(`https://openlibrary.org${key}.json`);
    if (!apiRes.ok) return res.json({});
    const json = (await apiRes.json()) as Record<string, unknown>;

    let description: string | undefined;
    const rawFirstSentence = json.first_sentence;
    const rawDesc = json.description;

    if (rawFirstSentence) {
      description =
        typeof rawFirstSentence === "string"
          ? rawFirstSentence
          : typeof (rawFirstSentence as Record<string, unknown>).value ===
              "string"
            ? ((rawFirstSentence as Record<string, unknown>).value as string)
            : undefined;
    }

    if (!description && rawDesc) {
      const full =
        typeof rawDesc === "string"
          ? rawDesc
          : typeof (rawDesc as Record<string, unknown>).value === "string"
            ? ((rawDesc as Record<string, unknown>).value as string)
            : undefined;
      if (full) {
        // Take just the first sentence
        const firstSentence = full.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
        description = firstSentence ?? full.slice(0, 200);
      }
    }

    // Subjects — filter out low-quality/non-English tags, cap at 5
    const rawSubjects = (json.subjects as string[] | undefined) ?? [];
    const subjects = rawSubjects
      .filter((s) => /^[\w\s,'-]+$/.test(s) && s.length < 40)
      .slice(0, 5);

    return res.json({ subjects });
  } catch {
    return res.json({});
  }
}
