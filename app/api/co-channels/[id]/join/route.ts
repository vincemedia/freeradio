import { NextResponse } from "next/server";
import { requireIdentity } from "@/lib/server/require-identity";
import { join } from "@/lib/server/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const who = await requireIdentity();
  if (!who.ok) return who.response;

  const { id } = await params;
  const result = join(id, who.personId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, reasons: result.reasons ?? [] },
      { status: 403 },
    );
  }
  return NextResponse.json(result);
}
