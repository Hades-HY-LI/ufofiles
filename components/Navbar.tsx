import Link from "next/link";
import { RadioTower } from "lucide-react";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/timeline", label: "Timeline" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" }
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-archive-void/82 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 shadow-glow">
            <RadioTower size={20} />
          </span>
          <span className="truncate font-[var(--font-space)] text-lg font-semibold tracking-wide">
            UFO Files Archive
          </span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1 text-sm text-slate-300">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 transition hover:bg-cyan-300/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
