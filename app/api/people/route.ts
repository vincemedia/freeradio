import { NextResponse } from "next/server";
import { listPeople } from "@/lib/server/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase();
  const rows = q
    ? listPeople().filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.handle.toLowerCase().includes(q) ||
          (p.username ?? "").toLowerCase().includes(q),
      )
    : listPeople();
  return NextResponse.json(rows);
}
