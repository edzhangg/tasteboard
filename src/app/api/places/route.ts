import { NextResponse } from "next/server";
import { MutationError, createPlace, newPlaceInput } from "@/lib/mutations";
import { ensureTakeFresh } from "@/lib/regenerate";
import { isPersistent, listPlaces } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const stored = await listPlaces();
  // Schedules a take for any both-logged place whose cached one is missing or
  // stale. A place with a current take is untouched, so reopening costs nothing.
  const places = await Promise.all(stored.map(ensureTakeFresh));

  return NextResponse.json(
    { places, persistent: isPersistent() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const parsed = newPlaceInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const place = await createPlace(parsed.data);
    return NextResponse.json({ place }, { status: 201 });
  } catch (error) {
    const status = error instanceof MutationError ? error.status : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
