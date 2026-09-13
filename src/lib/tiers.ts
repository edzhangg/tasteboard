import type { Tier, TierKey } from "./types";

/**
 * Score → tier. Boundaries are inclusive at the lower bound:
 * S 9.5–10 · A 8–9.5 · B 7–8 · C 6–7 · D 4–6 · F 0–4.
 */
export function tierOf(score: number | null | undefined): Tier | null {
  if (score == null || Number.isNaN(score)) return null;
  if (score >= 9.5) return "S";
  if (score >= 8) return "A";
  if (score >= 7) return "B";
  if (score >= 6) return "C";
  if (score >= 4) return "D";
  return "F";
}

export const TIER_ORDER: Tier[] = ["S", "A", "B", "C", "D", "F"];

/** The word that goes with each tier. Content, not style — the colours for a
 *  tier live in tokens.css, keyed on [data-tier]. */
export const TIER_WORD: Record<TierKey, string> = {
  S: "so fire",
  A: "excellent",
  B: "solid",
  C: "okay",
  D: "a miss",
  F: "never again",
  half: "half-logged",
};

/** The data-tier value for a combined score: "half" when it isn't a tier. */
export function tierKey(score: number | null): TierKey {
  return tierOf(score) ?? "half";
}

/** Rank for sorting: S→F, with unlogged/half-logged last. */
export function tierRank(score: number | null): number {
  const t = tierOf(score);
  return t == null ? 99 : TIER_ORDER.indexOf(t);
}

/** Clamp to 0–10 at one decimal. Used by every score entry path. */
export function clampScore(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

export const MAX_PHOTOS = 6;
