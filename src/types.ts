export type ProjectCategory = "film" | "game" | "live" | "single" | "album";
export type SongLanguage = "zh" | "en";
export type SongOriginType = "original" | "cover";
export type FeaturedArtistGender = "none" | "male" | "female" | "mixed" | "unknown";
export type PerformanceType = "solo" | "collaboration" | "duet";

export interface SongCredits {
  lyrics: boolean;
  composition: boolean;
}

export interface SongProject {
  title: string;
  type: string;
  category: ProjectCategory;
  display: string;
}

export interface SongSource {
  name: string;
  url: string;
  [key: string]: unknown;
}

export interface Song {
  id: string;
  title: string;
  aliases?: string[];
  releaseDate: string;
  durationSec?: number | null;
  favoriteCount: number | null;
  favoriteCountDisplay: string | null;
  language: SongLanguage;
  performanceType?: PerformanceType | null;
  originType: SongOriginType;
  featuredArtists: string[];
  featuredArtistGender: FeaturedArtistGender;
  curleyCredits: SongCredits;
  hintLyrics: string[];
  project: SongProject;
  sources: SongSource[];
  guessable?: boolean;
  [key: string]: unknown;
}

export type ComparisonStatus = "match" | "near" | "partial" | "miss" | "unknown";
export type ComparisonDirection = "up" | "down" | null;

export interface ComparisonCell<T = unknown> {
  value: T;
  status: ComparisonStatus;
  direction: ComparisonDirection;
}

export interface SongComparison {
  year: ComparisonCell;
  duration: ComparisonCell;
  favoriteCount: ComparisonCell;
  project: ComparisonCell;
  performance: ComparisonCell;
  originType: ComparisonCell;
  featuredArtistGender: ComparisonCell;
  language: ComparisonCell;
  credits: ComparisonCell;
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameAttempt {
  songId: string;
  comparison: SongComparison;
}

export interface GameState {
  version: 1;
  answerId: string;
  status: GameStatus;
  attempts: GameAttempt[];
  maxAttempts: 8;
}
