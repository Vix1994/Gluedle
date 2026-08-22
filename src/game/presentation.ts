import { FEATURED_ARTIST_GENDER_LABELS } from "../data/collaborator-genders.ts";
import { SONG_ORIGIN_LABELS } from "../data/song-provenance.ts";
import type { ComparisonCell, ComparisonStatus } from "../types.ts";

export function shuffleHints(hints: readonly string[]): string[] {
  const values = hints.filter(Boolean);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

export function formatCellValue(value: unknown, field: string): string {
  if (field === "year" && typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (match) return `${match[2]}-${match[3]}\n${match[1]}`;
  }
  if (field === "language") return labelValue(value, { zh: "中文", en: "英文" });
  if (field === "performance") {
    return labelValue(value, { solo: "独唱", collaboration: "合作", duet: "合唱" });
  }
  if (field === "originType") return labelValue(value, SONG_ORIGIN_LABELS);
  if (field === "featuredArtistGender") {
    return labelValue(value, FEATURED_ARTIST_GENDER_LABELS);
  }
  if (field === "credits" && value && typeof value === "object") {
    return formatCredits(value as Record<string, unknown>);
  }
  return String(value ?? "待核验");
}

export function comparisonAccessibilityHelper(comparison: ComparisonCell): string {
  const statusLabels: Record<ComparisonStatus, string> = {
    match: "✓ 匹配",
    near: "≈ 接近",
    partial: "≈ 部分匹配",
    miss: "× 不匹配",
    unknown: "— 待核验",
  };
  return statusLabels[comparison.status];
}

function labelValue(value: unknown, labels: Readonly<Record<string, string>>): string {
  if (value === null || value === undefined) return "待核验";
  return labels[String(value)] ?? String(value);
}

function formatCredits(credits: Record<string, unknown>): string {
  const participation = [
    credits.lyrics === true ? "词参与" : null,
    credits.composition === true ? "曲参与" : null,
  ].filter((value): value is string => value !== null);
  if (participation.length === 2) return "词·曲参与";
  if (participation.length > 0) return participation.join(" · ");
  if ([credits.lyrics, credits.composition].every((credit) => credit === false)) return "未参与";
  return "待核验";
}
