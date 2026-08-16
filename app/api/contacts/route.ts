import { NextResponse } from "next/server";
import { listContacts } from "@/lib/server/store";

export async function GET() {
  return NextResponse.json(listContacts());
}
