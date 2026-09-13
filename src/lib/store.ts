import "server-only";

import { Redis } from "@upstash/redis";
import type { Place } from "./types";
import { SEED_PLACES } from "./seed";

/**
 * Storage for the two-person board.
 *
 * Both people must see each other's visits from their own phones, so this is a
 * hosted store rather than localStorage. Upstash Redis (Vercel Marketplace,
 * free tier) is the default: it speaks HTTP, so it works from serverless and
 * edge runtimes without connection pooling, and the whole dataset is a few
 * dozen small JSON documents.
 *
 * Layout: one JSON document per place under `tasteboard:place:<id>`, plus a set
 * of ids under `tasteboard:places`. Per-place documents mean two people saving
 * different places at the same time can't clobber each other.
 *
 * With no credentials configured the store falls back to an in-memory map
 * seeded with the design's demo places. That keeps `npm run dev` working out of
 * the box, but it does NOT persist and does NOT sync between devices.
 */

const INDEX_KEY = "tasteboard:places";
const placeKey = (id: string) => `tasteboard:place:${id}`;

const hasRedis =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

let redis: Redis | null = null;
function client(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return redis;
}

/* ── in-memory fallback ──────────────────────────────────────────────────── */

declare global {
  // Survives hot reloads in dev.
  var __tasteboardMemory: Map<string, Place> | undefined;
}

function memory(): Map<string, Place> {
  if (!globalThis.__tasteboardMemory) {
    globalThis.__tasteboardMemory = new Map(
      SEED_PLACES.map((p) => [p.id, structuredClone(p)]),
    );
    console.warn(
      "[tasteboard] No KV_REST_API_URL configured — using an in-memory " +
        "store seeded with demo data. Visits will not persist or sync between devices.",
    );
  }
  return globalThis.__tasteboardMemory;
}

export function isPersistent(): boolean {
  return hasRedis;
}

/* ── operations ──────────────────────────────────────────────────────────── */

export async function listPlaces(): Promise<Place[]> {
  if (!hasRedis) return [...memory().values()].map((p) => structuredClone(p));

  const r = client();
  const ids = await r.smembers<string[]>(INDEX_KEY);
  if (!ids || ids.length === 0) return [];
  const docs = await r.mget<(Place | null)[]>(...ids.map(placeKey));
  return docs.filter((d): d is Place => d != null);
}

export async function getPlace(id: string): Promise<Place | null> {
  if (!hasRedis) {
    const p = memory().get(id);
    return p ? structuredClone(p) : null;
  }
  return (await client().get<Place>(placeKey(id))) ?? null;
}

export async function putPlace(place: Place): Promise<void> {
  if (!hasRedis) {
    memory().set(place.id, structuredClone(place));
    return;
  }
  const r = client();
  await r.set(placeKey(place.id), place);
  await r.sadd(INDEX_KEY, place.id);
}

export async function deletePlace(id: string): Promise<void> {
  if (!hasRedis) {
    memory().delete(id);
    return;
  }
  const r = client();
  await r.del(placeKey(id));
  await r.srem(INDEX_KEY, id);
}
