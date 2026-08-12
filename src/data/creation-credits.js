const CURLEY_NAME_PATTERN = /希林娜依(?:[·•・]?高)?|Curley\s*(?:G(?:ao)?)?/iu;

const CREDIT_PATTERNS = Object.freeze({
  lyrics: /^(?:(?:作词|作詞|词作者|詞作者|填词|填詞|词|詞)(?:\s*(?:[/／]\s*)?(?:Lyrics?|Lyricist))?|(?:Lyrics?|Lyricist)(?:\s+by)?)\s*[:：]\s*(.+)$/iu,
  composition: /^(?:(?:作曲|作曲者|曲)(?:\s*(?:[/／]\s*)?Composer)?|Composer|Composed\s+by)\s*[:：]\s*(.+)$/iu,
});

/** Extract whether Curley appears in the lyricist and composer credit lines. */
export function extractCurleyCredits(lyric) {
  const lines = String(lyric ?? "")
    .split(/\r?\n/u)
    .map(cleanCreditLine)
    .filter(Boolean);

  return {
    lyrics: creditIncludesCurley(lines, CREDIT_PATTERNS.lyrics),
    composition: creditIncludesCurley(lines, CREDIT_PATTERNS.composition),
  };
}

function cleanCreditLine(line) {
  return String(line ?? "")
    .replace(/^(?:\[[^\]]+\])+/u, "")
    .trim();
}

function creditIncludesCurley(lines, pattern) {
  const creditLine = lines
    .map((line) => line.match(pattern)?.[1]?.trim() ?? null)
    .find((credit) => credit !== null);
  return Boolean(creditLine && CURLEY_NAME_PATTERN.test(creditLine));
}
