const DEFAULT_MAX_HINTS = 3;
const MIN_HINT_LENGTH = 8;
const MAX_HINT_LENGTH = 72;

interface ExtractHintOptions {
  title?: string;
  artistNames?: string[];
  isMetadataLine?: (line: string) => boolean;
  maxHints?: number;
}

export function extractHintLyrics(
  lyric: unknown,
  {
    title = "",
    artistNames = [],
    isMetadataLine = () => false,
    maxHints = DEFAULT_MAX_HINTS,
  }: ExtractHintOptions = {},
) {
  const limit = Number.isFinite(Number(maxHints))
    ? Math.max(0, Math.floor(Number(maxHints)))
    : DEFAULT_MAX_HINTS;
  if (!String(lyric ?? "").trim() || limit === 0) return [];

  const normalizedTitle = normalizeHintText(title);
  const normalizedArtists = artistNames
    .map(normalizeHintText)
    .filter((artist) => artist.length >= 2);
  const lines = String(lyric)
    .split(/\r?\n/u)
    .map(cleanLyricLine)
    .filter((line) => isHintCandidate(line, {
      normalizedTitle,
      normalizedArtists,
      isMetadataLine,
    }));

  return [...new Set(lines)].slice(0, limit);
}

function cleanLyricLine(line: unknown): string {
  return String(line ?? "")
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function isHintCandidate(
  line: string,
  {
    normalizedTitle,
    normalizedArtists,
    isMetadataLine,
  }: {
    normalizedTitle: string;
    normalizedArtists: string[];
    isMetadataLine: (line: string) => boolean;
  },
): boolean {
  if (!line || isMetadataLine(line)) return false;
  const normalizedLine = normalizeHintText(line);
  if (normalizedLine.length < MIN_HINT_LENGTH || normalizedLine.length > MAX_HINT_LENGTH) {
    return false;
  }
  if (!/[A-Za-z\u3400-\u9fff\u3040-\u30ff]/u.test(line)) return false;
  if (normalizedTitle.length >= 2 && normalizedLine.includes(normalizedTitle)) return false;
  if (normalizedArtists.some((artist) => normalizedLine.includes(artist))) return false;
  return true;
}

function normalizeHintText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}
