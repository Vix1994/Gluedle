export const PENDING_VERIFICATION = "待核验";

export function normalizeSearchText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function getSongTitleLength(value: unknown): number {
  let title = String(value ?? "").normalize("NFKC").trim();
  const trailingAnnotation = /\s*(?:\([^()]*\)|（[^（）]*）)\s*$/u;

  while (trailingAnnotation.test(title)) {
    title = title.replace(trailingAnnotation, "").trim();
  }

  const characterUnits = [...title].filter((character) => (
    /\p{Script=Han}|\p{N}/u.test(character)
  )).length;
  const wordSource = title.replace(/[\p{Script=Han}\p{N}]+/gu, " ");
  const wordUnits = wordSource.match(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)?.length ?? 0;

  return characterUnits + wordUnits;
}

export function formatSongTitleLength(value: unknown): string {
  return `歌名长度 · ${String(getSongTitleLength(value)).padStart(2, "0")}`;
}

export function formatDuration(seconds: unknown): string {
  const duration = toFiniteNumber(seconds);
  if (duration === null || duration < 0) return PENDING_VERIFICATION;
  const rounded = Math.round(duration);
  const minutes = String(Math.floor(rounded / 60)).padStart(2, "0");
  const remainder = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function formatFavoriteCount(value: unknown): string {
  const count = toFiniteNumber(value);
  if (count === null || count < 0) return PENDING_VERIFICATION;
  const rounded = Math.round(count);
  if (rounded < 10000) return rounded.toLocaleString("zh-CN");
  if (rounded < 100000) {
    return `${(rounded / 10000).toFixed(1).replace(/\.0$/u, "")}万+`;
  }
  return `${Math.floor(rounded / 10000)}万+`;
}

export function formatReleaseDate(value: unknown): string {
  const timestamp = toReleaseTimestamp(value);
  if (timestamp === null) return PENDING_VERIFICATION;
  const date = new Date(timestamp);
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseFavoriteCountDisplay(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = /^([\d,.]+)\s*(百万|万|千|m|w|k)?\+?$/iu.exec(value.trim());
  if (!match) return null;
  const number = Number(match[1].replace(/,/gu, ""));
  if (!Number.isFinite(number) || number < 0) return null;
  const unit = match[2]?.toLocaleLowerCase("und");
  const multiplier = unit === "m" || unit === "百万"
    ? 1_000_000
    : unit === "w" || unit === "万"
      ? 10_000
      : unit === "k" || unit === "千" ? 1_000 : 1;
  return number * multiplier;
}

export function normalizedMetadataValue(value: unknown): string {
  return String(value).normalize("NFKC").trim().toLocaleLowerCase("und");
}

export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toReleaseTimestamp(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
    ? timestamp
    : null;
}
