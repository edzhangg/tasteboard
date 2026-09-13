import "server-only";

import { waitUntil } from "@vercel/functions";
import { getPlace, putPlace } from "./store";
import { bothLogged, generateTake, needsRegeneration, takeHash } from "./sharedTake";
import type { Place } from "./types";

/**
 * Hands a promise to the platform so it outlives the response.
 *
 * The shared take is generated after the save returns, so saving a visit stays
 * fast and the summary does not depend on the phone staying open — by the time
 * the place is next opened it is ready.
 */
function background(work: Promise<unknown>): void {
  const guarded = work.catch((error) => {
    console.error("[tasteboard] background task failed:", error);
  });
  try {
    waitUntil(guarded);
  } catch {
    // Not running on Vercel (local dev, or another host): the process stays
    // alive long enough on its own, so just let the promise run.
    void guarded;
  }
}

/**
 * Applies the shared-take caching contract to a mutated place.
 *
 * - Both people logged and the scoring inputs changed → mark the place pending
 *   so the client shows the "Rewriting the shared take…" state, and report that
 *   a regeneration is owed.
 * - Photo-only edit, or a mere reopen → the hash is unchanged, nothing happens.
 * - The place fell back to half-logged (the last visit by one person was
 *   deleted) → drop the take entirely; a half-logged place has no shared take.
 *
 * This is pure: the caller must persist the returned place BEFORE scheduling
 * the regeneration, otherwise the background task reads pre-save state and
 * discards itself as stale.
 */
export function applyTakePolicy(place: Place): { place: Place; regenerate: boolean } {
  if (!bothLogged(place)) {
    return {
      place: { ...place, take: null, takePendingHash: null, takePendingSince: null },
      regenerate: false,
    };
  }

  if (!needsRegeneration(place)) {
    return {
      place: { ...place, takePendingHash: null, takePendingSince: null },
      regenerate: false,
    };
  }

  return {
    place: {
      ...place,
      takePendingHash: takeHash(place),
      takePendingSince: new Date().toISOString(),
    },
    regenerate: true,
  };
}

/** How long a scheduled regeneration may stay pending before it is retried. */
const PENDING_TIMEOUT_MS = 90_000;

/**
 * The read path's half of the caching contract.
 *
 * A place can be both-logged with no cached take — it predates the feature, or
 * the background task was lost to a cold start. Without this, such a place
 * would show "Rewriting the shared take…" forever. It never fires when a
 * current take is already cached, so reopening a place still costs nothing.
 */
export async function ensureTakeFresh(place: Place): Promise<Place> {
  if (!bothLogged(place)) {
    return place.take || place.takePendingHash
      ? { ...place, take: null, takePendingHash: null, takePendingSince: null }
      : place;
  }

  if (!needsRegeneration(place)) return place;

  const hash = takeHash(place);
  const since = place.takePendingSince ? Date.parse(place.takePendingSince) : 0;
  const inFlight =
    place.takePendingHash === hash && Date.now() - since < PENDING_TIMEOUT_MS;

  // Already scheduled and still within its window — let that task finish.
  if (inFlight) return place;

  const pending: Place = {
    ...place,
    takePendingHash: hash,
    takePendingSince: new Date().toISOString(),
  };
  await putPlace(pending);
  background(regenerateInBackground(place.id, hash));
  return pending;
}

/** Persists a mutated place and kicks off its shared take if one is owed. */
export async function saveWithTakePolicy(mutated: Place): Promise<Place> {
  const { place, regenerate } = applyTakePolicy(mutated);
  await putPlace(place);
  if (regenerate) {
    background(regenerateInBackground(place.id, place.takePendingHash!));
  }
  return place;
}

async function regenerateInBackground(placeId: string, expectedHash: string): Promise<void> {
  const place = await getPlace(placeId);
  if (!place) return;

  // Another save may have landed already. That save scheduled its own
  // regeneration, so this one is stale — drop it.
  if (takeHash(place) !== expectedHash) return;

  const take = await generateTake(place);

  // Re-read before writing so a visit saved during the model call is not lost.
  const current = await getPlace(placeId);
  if (!current) return;
  if (takeHash(current) !== expectedHash) return;

  await putPlace({ ...current, take, takePendingHash: null, takePendingSince: null });
}
