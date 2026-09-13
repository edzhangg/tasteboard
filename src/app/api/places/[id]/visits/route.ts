import { NextResponse } from "next/server";
import { MutationError, addVisit, visitInput } from "@/lib/mutations";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = visitInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const place = await addVisit(id, parsed.data);
    return NextResponse.json({ place }, { status: 201 });
  } catch (error) {
    const status = error instanceof MutationError ? error.status : 500;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
