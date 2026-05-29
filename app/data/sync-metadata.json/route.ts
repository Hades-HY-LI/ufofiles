import { getSyncMetadata } from "@/lib/cases";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getSyncMetadata(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600"
    }
  });
}
