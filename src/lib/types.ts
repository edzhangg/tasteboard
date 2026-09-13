/** The two honor-system accounts. There is no authentication. */
export type PersonId = "jenn" | "eddy";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

/** What a card/hero is keyed on: a real tier, or the half-logged treatment. */
export type TierKey = Tier | "half";

export type Filter = "all" | Tier | "half";

export type Sort = "combined" | "jenn" | "eddy" | "date" | "cuisine" | "half";

export interface Visit {
  id: string;
  by: PersonId;
  /** YYYY-MM-DD */
  date: string;
  /** 0–10, one decimal. */
  score: number;
  note: string;
  /** Cloudinary secure URLs, max 6. */
  photos: string[];
}

export interface SharedTake {
  /** Exactly three bullets: agree, differ, verdict — in that order. */
  bullets: string[];
  /** Hash of the scoring inputs this take was generated from. */
  hash: string;
  generatedAt: string;
  /** True when the deterministic fallback produced it rather than the model. */
  fallback?: boolean;
}

export interface Place {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  visits: Visit[];
  /** Cached shared take. Absent until both people have logged the place. */
  take?: SharedTake | null;
  /** Set while a regeneration is in flight, so the client can show the
   *  "Rewriting the shared take…" state without keeping a socket open. */
  takePendingHash?: string | null;
  /** When that regeneration was scheduled, so a task lost to a cold start or a
   *  crash can be retried instead of leaving the place pending forever. */
  takePendingSince?: string | null;
}

export const PEOPLE: Record<PersonId, string> = {
  jenn: "Jenn",
  eddy: "Eddy",
};

export const OTHER: Record<PersonId, PersonId> = {
  jenn: "eddy",
  eddy: "jenn",
};

export function personName(id: PersonId): string {
  return PEOPLE[id];
}
