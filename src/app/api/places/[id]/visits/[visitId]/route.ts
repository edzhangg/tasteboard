import { NextResponse } from "next/server";
import { MutationError, deleteVisit, updateVisit, visitInput } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; visitId: string }> },
) {
  try {
    const { id, visitId } = await params;
    const parsed = visitInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const place = await updateVisit(id, visitId, parsed.data);
    return NextResponse.json({ place });
  } catch (error) {
    const status = error instanceof MutationError ? error.status : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; visitId: string }> },
) {
  try {
    const { id, visitId } = await params;
    const by = new URL(request.url).searchParams.get("by") ?? "";
    const place = await deleteVisit(id, visitId, by);
    return NextResponse.json({ place });
  } catch (error) {
    const status = error instanceof MutationError ? error.status : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
