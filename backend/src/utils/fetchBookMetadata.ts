import fetch from "node-fetch";
import * as cheerio from "cheerio";

export interface BookMetadata {
  title?: string;
  author?: string;
  coverImageUrl?: string;
  sourceUrl?: string;
}

/**
 * Attempt to extract book metadata from a URL.
 *
 * Strategy (in order):
 *  1. Open Graph meta tags  (og:title, og:image, book:author / og:description)
 *  2. JSON-LD structured data  (schema.org Book type)
 *  3. Plain HTML fallback       (<title>, <meta name="author">, first large image)
 *
 * This is best-effort — missing fields will be undefined.
 */
export async function fetchBookMetadata(url: string): Promise<BookMetadata> {
  const response = await fetch(url, {
    headers: {
      // Impersonate a browser to reduce bot-blocking
      "User-Agent": "Mozilla/5.0 (compatible; BookClubBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    // Timeout via AbortController
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const meta: BookMetadata = { sourceUrl: url };

  // ── 1. Open Graph ────────────────────────────────────────────────────────
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  // Some book sites use book:author; fall back to og:description for GoodReads-style pages
  const ogAuthor =
    $('meta[property="books:author"]').attr("content") ||
    $('meta[property="book:author"]').attr("content");

  if (ogTitle) meta.title = ogTitle.trim();
  if (ogImage) meta.coverImageUrl = ogImage.trim();
  if (ogAuthor) meta.author = ogAuthor.trim();

  // ── 2. JSON-LD ───────────────────────────────────────────────────────────
  if (!meta.title || !meta.author) {
    $('script[type="application/ld+json"]').each((_i, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "");
        const entries: unknown[] = Array.isArray(json) ? json : [json];
        for (const entry of entries) {
          if (!entry || typeof entry !== "object") continue;
          const obj = entry as Record<string, unknown>;
          const type = obj["@type"];
          // Accept Book or any supertype
          if (type === "Book" || type === "Product") {
            if (!meta.title && typeof obj.name === "string")
              meta.title = obj.name.trim();
            if (!meta.coverImageUrl) {
              const img = obj.image;
              if (typeof img === "string") meta.coverImageUrl = img.trim();
              else if (Array.isArray(img) && typeof img[0] === "string")
                meta.coverImageUrl = img[0].trim();
            }
            // Author can be a string or { @type: Person, name: string }
            if (!meta.author) {
              const authorField = obj.author;
              if (typeof authorField === "string") {
                meta.author = authorField.trim();
              } else if (authorField && typeof authorField === "object") {
                const a = authorField as Record<string, unknown>;
                if (typeof a.name === "string") meta.author = a.name.trim();
              } else if (Array.isArray(authorField) && authorField.length > 0) {
                const first = authorField[0] as Record<string, unknown>;
                if (typeof first.name === "string")
                  meta.author = first.name.trim();
              }
            }
          }
        }
      } catch {
        // Malformed JSON-LD — ignore and continue
      }
    });
  }

  // ── 3. HTML fallback ─────────────────────────────────────────────────────
  if (!meta.title) {
    const pageTitle = $("title").first().text().trim();
    if (pageTitle) meta.title = pageTitle;
  }
  if (!meta.author) {
    const metaAuthor = $('meta[name="author"]').attr("content");
    if (metaAuthor) meta.author = metaAuthor.trim();
  }
  // If still no image, grab the first reasonably-sized img on the page
  if (!meta.coverImageUrl) {
    const firstImg = $("img[src]")
      .filter((_i, el) => {
        const src = $(el).attr("src") ?? "";
        return src.startsWith("http") || src.startsWith("//");
      })
      .first()
      .attr("src");
    if (firstImg) {
      meta.coverImageUrl = firstImg.startsWith("//")
        ? `https:${firstImg}`
        : firstImg;
    }
  }

  return meta;
}
