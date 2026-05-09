import type { Metadata } from "next";
import { getCases } from "@/lib/cases";
import { MapShell } from "@/components/MapShell";

export const metadata: Metadata = {
  title: "Map"
};

export default function MapPage() {
  const cases = getCases();

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <MapShell cases={cases} />
    </main>
  );
}
