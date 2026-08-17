import { NextResponse } from "next/server";
import { realtimeConfig } from "@/lib/server/realtimekit";

export const dynamic = "force-dynamic";

/**
 * Whether live audio is wired up, and if not, which piece is missing.
 *
 * Presence only — never a value. Diagnosing this from the outside otherwise
 * means guessing between "the variable is not set", "the deployment is stale"
 * and "the code cannot see it", which are three different problems with the
 * same symptom.
 */
export async function GET() {
  return NextResponse.json({
    configured: realtimeConfig() !== null,
    present: {
      CLOUDFLARE: Boolean(process.env.CLOUDFLARE),
      CLOUDFLARE_ACCOUNT_ID: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID),
      REALTIMEKIT_APP_ID: Boolean(process.env.REALTIMEKIT_APP_ID),
    },
    push: {
      configured: Boolean(
        process.env.VAPID_PRIVATE_KEY &&
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
          process.env.BLOB_READ_WRITE_TOKEN,
      ),
    },
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
