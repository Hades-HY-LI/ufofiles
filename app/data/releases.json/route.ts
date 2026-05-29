import { getReleases } from "@/lib/cases";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getReleases(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600"
    }
  });
}
