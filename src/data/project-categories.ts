export const PROJECT_CATEGORY_VALUES = Object.freeze([
  "film",
  "game",
  "live",
  "single",
  "album",
]);

import type { ProjectCategory } from "../types.ts";

type ProjectLike = {
  title?: unknown;
  type?: unknown;
  category?: unknown;
  isLive?: unknown;
};
type SongProjectLike = { title?: unknown; project?: ProjectLike };

export const PROJECT_CATEGORY_LABELS = Object.freeze({
  film: "影视",
  game: "游戏",
  live: "Live",
  single: "单曲",
  album: "专辑",
});

// 按歌曲名维护实际项目；QQ 返回“单曲”但实际属于专辑/EP 时在这里补充。
export const SONG_PROJECT_OVERRIDES = Object.freeze({
  // "歌曲名": { title: "实际专辑名", type: "album" },
  "Glue": { title: "GLUE", type: "album" },
});

// 这里按歌曲名维护需要人工确认的项目分类，避免把同一项目里的其他歌曲一起误判。
const SONG_CATEGORY_OVERRIDES = Object.freeze({
  "烬火 Emberfire": "game",
  "如火": "game",
  "Fight of Your Life (特别版)": "game",
  "精英不凡": "game",
  "热辣滚烫": "film",
  "猜": "film",
  "陷入爱情": "film",
  "为我们失去的": "film",
  "危爱": "film",
  "Stay With Me (原创版)": "live",
});

// 保留旧的导出位置，来源配置的实际定义统一放在 song-provenance.ts。
export { SONG_ORIGIN_OVERRIDES } from "./song-provenance.ts";

export function getSongProjectOverride(songTitle: unknown) {
  const title = typeof songTitle === "string" ? songTitle.trim() : "";
  return (SONG_PROJECT_OVERRIDES as Readonly<Record<string, ProjectLike>>)[title] ?? null;
}

export function getSongProject(song: SongProjectLike = {}): ProjectLike {
  return getSongProjectOverride(song.title) ?? song.project ?? {};
}

export function getSongProjectCategory(song: SongProjectLike = {}): ProjectCategory {
  const title = typeof song.title === "string" ? song.title.trim() : "";
  const override = (SONG_CATEGORY_OVERRIDES as Readonly<Record<string, ProjectCategory>>)[title];
  if (override) return override;
  return getProjectCategory(getSongProject(song));
}

export function getProjectCategory(project: ProjectLike = {}): ProjectCategory {
  const explicitCategory = normalizeCategory(project.category);
  if (explicitCategory) return explicitCategory;

  const title = typeof project.title === "string" ? project.title : "";
  if (/live/iu.test(title)) return "live";

  const type = normalizeProjectType(project.type);
  if (type === "single") return "single";
  if (type === "live" || project.isLive === true) return "live";
  if (type === "ost") return "film";
  return "album";
}

export function getProjectDisplay(project: ProjectLike = {}): string {
  const category = getProjectCategory(project);
  if (category === "album") {
    return typeof project.title === "string" && project.title.trim()
      ? project.title.trim()
      : "待核验";
  }
  return PROJECT_CATEGORY_LABELS[category];
}

function normalizeProjectType(type: unknown): string {
  return typeof type === "string" ? type.trim().toLowerCase() : "";
}

function normalizeCategory(category: unknown): ProjectCategory | null {
  if (typeof category !== "string") return null;
  const normalized = category.trim().toLowerCase();
  const aliases: Record<string, ProjectCategory> = {
    album: "album",
    "专辑": "album",
    film: "film",
    "影视": "film",
    game: "game",
    "游戏": "game",
    live: "live",
    single: "single",
    "单曲": "single",
  };
  return aliases[normalized] ?? null;
}
