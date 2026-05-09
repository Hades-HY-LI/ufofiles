import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-6 py-20">
      <EmptyState
        title="Signal not found"
        description="That archive record is not available in the current official-source dataset."
        action={<Link href="/explore">Return to Explore</Link>}
      />
    </main>
  );
}
