import "server-only";

import { z } from "zod";
import { uid } from "./format";
import { saveWithTakePolicy } from "./regenerate";
import { getPlace } from "./store";
import { MAX_PHOTOS, clampScore } from "./tiers";
import type { Place, Visit } from "./types";

export const visitInput = z.object({
  by: z.enum(["jenn", "eddy"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  score: z.number().min(0).max(10),
  note: z.string().max(4000).default(""),
  photos: z.array(z.string().url()).max(MAX_PHOTOS).default([]),
});

export const newPlaceInput = z.object({
  name: z.string().max(120).default(""),
  cuisine: z.string().max(80).default(""),
  area: z.string().max(80).default(""),
  visit: visitInput,
});

export type VisitInput = z.infer<typeof visitInput>;

/** Thrown for anything the client got wrong; carries an HTTP status. */
export class MutationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function toVisit(input: VisitInput, id: string): Visit {
  return {
    id,
    by: input.by,
    date: input.date,
    score: clampScore(input.score),
    note: input.note,
    photos: input.photos.slice(0, MAX_PHOTOS),
  };
}

export async function createPlace(input: z.infer<typeof newPlaceInput>): Promise<Place> {
  const place: Place = {
    id: uid(),
    name: input.name.trim() || "Untitled place",
    cuisine: input.cuisine.trim() || "Unfiled",
    area: input.area.trim() || "—",
    visits: [toVisit(input.visit, uid())],
    take: null,
    takePendingHash: null,
  };

  return saveWithTakePolicy(place);
}

export async function addVisit(placeId: string, input: VisitInput): Promise<Place> {
  const place = await getPlace(placeId);
  if (!place) throw new MutationError("No such place", 404);

  return saveWithTakePolicy({
    ...place,
    visits: [...place.visits, toVisit(input, uid())],
  });
}

export async function updateVisit(
  placeId: string,
  visitId: string,
  input: VisitInput,
): Promise<Place> {
  const place = await getPlace(placeId);
  if (!place) throw new MutationError("No such place", 404);

  const existing = place.visits.find((v) => v.id === visitId);
  if (!existing) throw new MutationError("No such visit", 404);

  // You can only edit your own visits. The accounts are honor-system, but the
  // server still refuses to let one account rewrite the other's score.
  if (existing.by !== input.by) {
    throw new MutationError("You can only edit your own visits", 403);
  }

  return saveWithTakePolicy({
    ...place,
    visits: place.visits.map((v) =>
      v.id === visitId ? { ...toVisit(input, visitId), by: existing.by } : v,
    ),
  });
}

export async function deleteVisit(
  placeId: string,
  visitId: string,
  by: string,
): Promise<Place> {
  const place = await getPlace(placeId);
  if (!place) throw new MutationError("No such place", 404);

  const existing = place.visits.find((v) => v.id === visitId);
  if (!existing) throw new MutationError("No such visit", 404);
  if (existing.by !== by) {
    throw new MutationError("You can only delete your own visits", 403);
  }

  return saveWithTakePolicy({
    ...place,
    visits: place.visits.filter((v) => v.id !== visitId),
  });
}
