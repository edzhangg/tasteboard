import { NextResponse } from "next/server";
import { MutationError, placeDetailsInput, updatePlaceDetails } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = placeDetailsInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const place = await updatePlaceDetails(id, parsed.data);
    return NextResponse.json({ place });
  } catch (error) {
    const status = error instanceof MutationError ? error.status : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
