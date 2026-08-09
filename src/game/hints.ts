export const HINT_UNLOCK_ATTEMPTS = Object.freeze([3, 5, 7]);

export function getHintUnlockCount(attemptCount: unknown): number {
  const safeAttemptCount = toNonNegativeInteger(attemptCount);
  return HINT_UNLOCK_ATTEMPTS.filter((threshold) => safeAttemptCount >= threshold).length;
}

export function getHintStatus({
  attemptCount,
  revealedHintCount = 0,
  hintCount = 0,
}: {
  attemptCount?: unknown;
  revealedHintCount?: unknown;
  hintCount?: unknown;
} = {}) {
  const safeHintCount = toNonNegativeInteger(hintCount);
  const safeRevealedHintCount = toNonNegativeInteger(revealedHintCount);
  const unlockedCount = Math.min(getHintUnlockCount(attemptCount), safeHintCount);
  const nextHintIndex = safeRevealedHintCount < unlockedCount ? safeRevealedHintCount : -1;
  const nextUnlockAttempt = HINT_UNLOCK_ATTEMPTS[safeRevealedHintCount] ?? null;
  const safeAttemptCount = toNonNegativeInteger(attemptCount);

  return {
    unlockedCount,
    nextHintIndex,
    nextUnlockAttempt,
    attemptsUntilNext: nextHintIndex >= 0 || nextUnlockAttempt === null
      ? 0
      : Math.max(0, nextUnlockAttempt - safeAttemptCount),
    hasAvailableHint: nextHintIndex >= 0,
    hasMoreHints: safeRevealedHintCount < safeHintCount,
  };
}

function toNonNegativeInteger(value: unknown): number {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}
