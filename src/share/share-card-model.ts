import { getProjectDisplay } from "../data/project-categories.ts";
import { SONG_ORIGIN_LABELS } from "../data/song-provenance.ts";
import { formatDuration, formatFavoriteCount } from "../game/engine.ts";
import type { ComparisonStatus, GameStatus } from "../types.ts";

export const SHARE_FIELDS = [
  "year",
  "duration",
  "favoriteCount",
  "language",
  "project",
  "performance",
  "originType",
  "featuredArtistGender",
  "credits",
] as const;

export type ShareField = typeof SHARE_FIELDS[number];

interface ShareAttempt {
  songId?: string;
  comparison: Partial<Record<ShareField, { status?: unknown }>>;
}

interface ShareState {
  status: GameStatus;
  answerId?: string;
  attempts: ShareAttempt[];
}

interface ShareCardSongInfo {
  title: string;
  project: string;
  releaseDate: string;
  duration: string;
  favoriteCount: string;
  language: string;
  performance: string;
  origin: string;
  featuredArtists: string;
  credits: string;
}

export interface ShareCardModel {
  roundLabel: string;
  outcome: string;
  canonicalUrl: string;
  song: ShareCardSongInfo | null;
  rows: ComparisonStatus[][];
}

const VALID_STATUSES = new Set<ComparisonStatus>([
  "match",
  "near",
  "partial",
  "miss",
  "unknown",
]);

export function buildShareCardModel({
  roundLabel,
  state,
  canonicalUrl,
  answer = null,
}: {
  roundLabel: string;
  state: ShareState;
  canonicalUrl: string;
  answer?: unknown;
}): ShareCardModel {
  const outcome = state.status === "won"
    ? `${state.attempts.length} / 8`
    : state.status === "lost" ? "X / 8" : `${state.attempts.length} / …`;
  return {
    roundLabel,
    outcome,
    canonicalUrl,
    song: state.status === "playing" ? null : normalizeSongInfo(answer),
    rows: state.attempts.map((attempt) =>
      SHARE_FIELDS.map((field) => normalizeStatus(attempt.comparison[field]?.status)),
    ),
  };
}

function normalizeStatus(status: unknown): ComparisonStatus {
  return typeof status === "string" && VALID_STATUSES.has(status as ComparisonStatus)
    ? status as ComparisonStatus
    : "unknown";
}

function normalizeSongInfo(song: unknown): ShareCardSongInfo | null {
  if (!song || typeof song !== "object") return null;
  const candidate = song as Record<string, unknown>;
  if (typeof candidate.title !== "string") return null;

  const featuredArtists = Array.isArray(candidate.featuredArtists)
    ? candidate.featuredArtists.filter((artist: unknown): artist is string => (
      typeof artist === "string" && Boolean(artist.trim())
    ))
    : [];
  return {
    title: candidate.title,
    project: getProjectDisplay(isPlainObject(candidate.project) ? candidate.project : {}),
    releaseDate: typeof candidate.releaseDate === "string" ? candidate.releaseDate : "待核验",
    duration: formatDuration(candidate.durationSec),
    favoriteCount: typeof candidate.favoriteCountDisplay === "string" && candidate.favoriteCountDisplay
      ? candidate.favoriteCountDisplay
      : formatFavoriteCount(candidate.favoriteCount),
    language: ({ zh: "中文", en: "英文" } as Record<string, string>)[readKey(candidate.language)]
      ?? "待核验",
    performance: {
      solo: "独唱",
      collaboration: "合作",
      duet: "合唱",
    }[readKey(candidate.performanceType) as "solo" | "collaboration" | "duet"] ?? "待核验",
    origin: (SONG_ORIGIN_LABELS as Record<string, string>)[readKey(candidate.originType)] ?? "待核验",
    featuredArtists: featuredArtists.length ? `合作：${featuredArtists.join("、")}` : "无合作对象",
    credits: formatCredits(candidate.curleyCredits),
  };
}

function readKey(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatCredits(credits: unknown): string {
  if (!credits || typeof credits !== "object") return "待核验";
  const value = credits as Record<string, unknown>;
  if (value.lyrics === true && value.composition === true) return "词·曲参与";
  if (value.lyrics === true) return "词参与";
  if (value.composition === true) return "曲参与";
  if (value.lyrics === false && value.composition === false) return "未参与";
  return "待核验";
}
