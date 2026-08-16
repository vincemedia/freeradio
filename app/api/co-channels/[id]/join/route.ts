import { NextResponse } from "next/server";
import { join } from "@/lib/server/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = join(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, reasons: result.reasons ?? [] },
      { status: 403 },
    );
  }
  return NextResponse.json(result);
}
