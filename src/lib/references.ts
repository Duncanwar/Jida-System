/**
 * Splits a freeform references blob — pasted by an author straight from a
 * source document, in whatever shape it happens to be in — into individual
 * entries, and returns them in the order the reference style implies.
 *
 * Real pastes arrive in three broad shapes, tried in order of reliability:
 *
 *  A. Sequential footnote/endnote numbering ("1 …", "2 …", sometimes with
 *     the number alone on its own line before a bare "Ibid., p. X"). This
 *     is citation order, not alphabetical, and must be preserved as-is.
 *
 *  B. Real line breaks, almost always preserved intact from the source
 *     document. A new reference starts wherever a line opens with a
 *     capital letter and reaches a four-digit year within a short
 *     distance — true regardless of author-name shape (person, acronym,
 *     organization, reversed order) — while a line that's just the
 *     word-wrapped continuation of the previous entry essentially never
 *     does. This is the common case, and covers blank-line-separated,
 *     one-per-line, and tightly-wrapped-with-no-blank-lines lists alike,
 *     since a blank line simply contributes nothing and gets skipped.
 *     Results are alphabetized, per APA convention.
 *
 *  C. Last resort: no usable line structure at all — a single physical
 *     line or paragraph with entries run together. Found instead by the
 *     "Name, I., & Name, I. (Year)" pattern that starts each one,
 *     including chains of three or more authors joined by plain commas
 *     before the final "&", and organization authors with no initials.
 *
 * None of this is a citation parser — it's a best-effort measure for
 * counting and displaying entries the author already wrote, not for
 * validating or correcting them. A blob with no recognizable boundary is
 * left as a single entry rather than guessed at.
 */
export function splitReferences(raw: string): string[] {
  const cleaned = raw.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const stripMarker = (s: string) =>
    s.replace(/^\s*(?:\[\d+\]|\(\d+\)|\d+[.)]|[-•*])\s*/, "");
  const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
  const tidy = (s: string) => collapse(stripMarker(s));
  const alphabetize = (list: string[]) => list.slice().sort((a, b) => a.localeCompare(b));

  // Strategy A — sequential footnote/endnote numbering.
  const footnotes = splitByFootnoteNumbers(cleaned);
  if (footnotes) return footnotes;

  // Strategy B — line-start detection.
  const MONTH_START =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
  // A run of underscores or dashes stands in for "same author as above" —
  // its own reference, just without repeating the name.
  const REPEATED_AUTHOR = /^[_\-—]{2,}\s*\(\s?\d{4}/;
  // A citation year is plausibly 15xx–20xx, and isn't wedged against another
  // digit or a decimal point — which is how a DOI or ISSN fragment
  // ("doi:10.5121/ijaia.2012.3208") would otherwise read as one.
  const YEAR_NEAR_START = /^[A-Z].{0,140}?\b(?<![.\d])(?:1[5-9]\d{2}|20\d{2})\b(?!\.\d)/;
  // A humanities/legal-style citation that opens straight into a quoted
  // title ('Surname, I., "Title…"') sometimes carries no parenthetical year
  // at all — the quote mark right after the author's initials is the only
  // signal a new entry has started.
  const QUOTED_TITLE = /^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’\-]+,\s(?:[A-Z]\.\s?){1,3},\s?["“]/;
  const startsEntry = (line: string) =>
    REPEATED_AUTHOR.test(line) ||
    QUOTED_TITLE.test(line) ||
    (!MONTH_START.test(line) && YEAR_NEAR_START.test(line));

  const lines = cleaned.split("\n");
  const entries: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^\d{1,4}$/.test(line)) continue; // stray page-number artifact
    if (startsEntry(line)) {
      if (current) entries.push(current);
      current = stripMarker(line);
    } else {
      current = current ? `${current} ${line}` : stripMarker(line);
    }
  }
  if (current) entries.push(current);

  if (entries.length > 1) return alphabetize(entries.map(collapse));

  // Strategy C — author-year boundary heuristic over the run-together text.
  const text = collapse(cleaned);
  const initials = "(?:[A-Z]\\.\\s?){1,3}";
  const person = `[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’\\-]+,\\s${initials}`;
  const org = "[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’\\-]+(?:\\s[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’\\-]+){1,4}";
  const authorUnit = `(?:${person}|${org})`;
  const sep = "(?:,\\s(?:&\\s)?|\\s&\\s|,?\\sand\\s)";
  const boundary = new RegExp(`${authorUnit}(?:${sep}${authorUnit})*\\.?\\s?\\(\\d{4}[a-z]?\\)`, "g");

  const starts: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text))) starts.push(match.index);

  if (starts.length < 2) return [tidy(text)];

  const boundaryEntries = starts
    .map((start, i) => collapse(text.slice(start, starts[i + 1] ?? text.length)))
    .filter(Boolean);
  return alphabetize(boundaryEntries);
}

/**
 * Detects a strictly sequential 1, 2, 3, … footnote/endnote numbering, each
 * marking a new reference at the start of a line — with or without a space
 * before the reference text (a PDF-extraction artifact sometimes glues the
 * number straight onto the next word, e.g. "7D. Moran…"), or alone on its
 * own line when the reference itself is just "Ibid., p. X". Returns null
 * when no such sequence is present, so the caller falls through to the
 * general-purpose strategies.
 *
 * A page or issue number that happens to wrap onto its own line (e.g. the
 * "75" in a citation reading "…No. \n75/76, The Anniversary Issue…") is
 * indistinguishable from a real marker by shape alone, so rather than
 * requiring every line-start digit to fit the sequence, only the strictly
 * increasing 1, 2, 3, … subsequence is accepted as real markers — anything
 * that doesn't fit next is noise, and stays inside the surrounding entry's
 * text rather than being treated as a boundary.
 */
function splitByFootnoteNumbers(cleaned: string): string[] | null {
  const marker = /(?:^|\n)[ \t]*(\d{1,3})/g;
  const candidates: { num: number; index: number; markerEnd: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(cleaned))) {
    candidates.push({ num: Number(m[1]), index: m.index, markerEnd: m.index + m[0].length });
  }
  if (candidates.length < 2) return null;

  const accepted: typeof candidates = [];
  let expected = 1;
  for (const c of candidates) {
    if (c.num === expected) {
      accepted.push(c);
      expected++;
    }
  }
  if (accepted.length < 2) return null;

  const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
  const entries: string[] = [];
  for (let i = 0; i < accepted.length; i++) {
    const start = accepted[i].markerEnd;
    const end = i + 1 < accepted.length ? accepted[i + 1].index : cleaned.length;
    const text = collapse(cleaned.slice(start, end));
    if (text) entries.push(text);
  }
  return entries.length >= 2 ? entries : null;
}

/**
 * Pulls a direct, clickable URL out of a reference's own text — a link
 * that's already there ("…Retrieved from https://…", "doi:10.1234/x…",
 * "www.example.com…") rather than a guess at where the work might live.
 * Preferred in this order: an explicit http(s) URL, a bare DOI, then a
 * bare "www." address. Returns null when the reference names no address at
 * all, so the caller can fall back to a labeled search instead of implying
 * a verified match that was never checked.
 */
export function extractReferenceLink(entry: string): string | null {
  const http = entry.match(/https?:\/\/[^\s"'<>]+/i);
  if (http) return trimTrailingPunctuation(http[0]);

  const doi = entry.match(/\bdoi:?\s*(10\.\d{4,9}\/[^\s,;"'<>]+)/i);
  if (doi) return `https://doi.org/${trimTrailingPunctuation(doi[1])}`;

  const www = entry.match(/\bwww\.[^\s"'<>]+/i);
  if (www) return `https://${trimTrailingPunctuation(www[0])}`;

  return null;
}

/** Strips citation punctuation (a trailing period, comma, closing quote…)
 * that trailed along with the URL match but isn't part of the address —
 * while keeping a closing ")" that actually balances an opening one
 * earlier in the URL, as in a Wikipedia article title. */
function trimTrailingPunctuation(url: string): string {
  let result = url.replace(/[.,;:\]}"'’”]+$/, "");
  while (result.endsWith(")")) {
    const opens = (result.match(/\(/g) ?? []).length;
    const closes = (result.match(/\)/g) ?? []).length;
    if (closes <= opens) break;
    result = result.slice(0, -1);
  }
  return result;
}
