import { NextResponse } from "next/server";
import { ecosystems } from "@/data/ecosystems";
import { listCoChannels } from "@/lib/server/store";

/** Each band with a count, so the switch can say how busy the others are. */
export async function GET() {
  return NextResponse.json(
    ecosystems.map((e) => {
      const rows = listCoChannels({ ecosystem: e.id });
      return {
        ...e,
        coChannelCount: rows.length,
        occupantCount: rows.reduce((n, c) => n + c.occupantCount, 0),
        contactCount: rows.reduce((n, c) => n + c.contactCount, 0),
      };
    }),
  );
}
