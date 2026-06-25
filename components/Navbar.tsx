"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "@/lib/utils";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/releases", label: "Releases" },
  { href: "/timeline", label: "Timeline" },
  { href: "/graph", label: "Graph" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/88 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/logo-mark.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 bg-white shadow-sm"
          />
          <span className="min-w-0">
            <span className="block truncate font-[var(--font-space)] text-lg font-semibold tracking-wide text-neutral-950">
              UFO Files Archive
            </span>
            <span className="hidden text-xs text-neutral-500 sm:block">
              Official UFO / UAP records
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 text-sm text-neutral-600 shadow-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={clsx(
                "rounded-md px-3 py-2 transition",
                isActive(pathname, link.href)
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "hover:bg-neutral-100 hover:text-neutral-950"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
