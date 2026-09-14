import { tierOf, tierRank } from "./tiers";
import type { Filter, PersonId, Place, Sort, Visit } from "./types";

/** A person's average is the mean of THEIR OWN visits. */
export function personAverage(place: Place, who: PersonId): number | null {
  const mine = place.visits.filter((v) => v.by === who);
  if (mine.length === 0) return null;
  return mine.reduce((sum, v) => sum + v.score, 0) / mine.length;
}

/**
 * The combined average is the mean of the two PERSONAL averages — not the mean
 * of all visits. It exists only once both people have logged the place.
 */
export function combinedAverage(place: Place): number | null {
  const j = personAverage(place, "jenn");
  const e = personAverage(place, "eddy");
  if (j == null || e == null) return null;
  return (j + e) / 2;
}

/** A place is half-logged until both people have logged it. No combined tier. */
export function isHalfLogged(place: Place): boolean {
  return combinedAverage(place) == null;
}

export function missingPerson(place: Place): PersonId | null {
  if (personAverage(place, "jenn") == null) return "jenn";
  if (personAverage(place, "eddy") == null) return "eddy";
  return null;
}

/** The three scores a place carries, computed once per render. */
export interface PlaceScores {
  jenn: number | null;
  eddy: number | null;
  combined: number | null;
}

export function scoresOf(place: Place): PlaceScores {
  const jenn = personAverage(place, "jenn");
  const eddy = personAverage(place, "eddy");
  return {
    jenn,
    eddy,
    combined: jenn == null || eddy == null ? null : (jenn + eddy) / 2,
  };
}

/** Latest visit date as YYYY-MM-DD, or "" when there are none. */
export function lastVisitDate(place: Place): string {
  return place.visits.map((v) => v.date).sort().at(-1) ?? "";
}

/** Newest first. */
export function visitsNewestFirst(place: Place): Visit[] {
  return [...place.visits].sort((a, b) => b.date.localeCompare(a.date));
}

export function filterPlaces(places: Place[], filter: Filter): Place[] {
  if (filter === "all") return places;
  return places.filter((p) => {
    const combined = combinedAverage(p);
    if (filter === "half") return combined == null;
    return tierOf(combined) === filter;
  });
}

export function filterByArea(places: Place[], area: string): Place[] {
  if (area === "all") return places;
  return places.filter((p) => p.area === area);
}

/** Lowercases and strips accents, so "cafe" matches "Café". */
function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function filterBySearch(places: Place[], query: string): Place[] {
  const q = normalizeForSearch(query.trim());
  if (!q) return places;
  return places.filter((p) =>
    [p.name, p.cuisine, p.area].some((field) => normalizeForSearch(field).includes(q)),
  );
}

/**
 * Tier sorts rank by tier index first (S→F), then by raw score descending,
 * with unlogged/half-logged last.
 */
export function sortPlaces(places: Place[], sort: Sort): Place[] {
  const byDateDesc = (a: Place, b: Place) =>
    lastVisitDate(b).localeCompare(lastVisitDate(a));

  const byTier = (pick: (s: PlaceScores) => number | null) => (a: Place, b: Place) => {
    const sa = pick(scoresOf(a));
    const sb = pick(scoresOf(b));
    return tierRank(sa) - tierRank(sb) || (sb ?? 0) - (sa ?? 0);
  };

  const sorted = [...places];
  switch (sort) {
    case "combined":
      return sorted.sort(byTier((s) => s.combined));
    case "jenn":
      return sorted.sort(byTier((s) => s.jenn));
    case "eddy":
      return sorted.sort(byTier((s) => s.eddy));
    case "date":
      return sorted.sort(byDateDesc);
    case "cuisine":
      return sorted.sort((a, b) => a.cuisine.localeCompare(b.cuisine));
    case "half":
      // Places missing one person float to the top, then most recent.
      return sorted.sort(
        (a, b) =>
          (combinedAverage(a) == null ? 0 : 1) - (combinedAverage(b) == null ? 0 : 1) ||
          byDateDesc(a, b),
      );
  }
}

export const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "combined", label: "Combined tier" },
  { value: "jenn", label: "Jenn's tier" },
  { value: "eddy", label: "Eddy's tier" },
  { value: "date", label: "Most recent visit" },
  { value: "cuisine", label: "Cuisine" },
  { value: "half", label: "Half-logged first" },
];
