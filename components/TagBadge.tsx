import { clsx } from "@/lib/utils";

type TagBadgeProps = {
  children: React.ReactNode;
  tone?: "cyan" | "violet" | "slate" | "mint";
};

export function TagBadge({ children, tone = "slate" }: TagBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        tone === "cyan" &&
          "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
        tone === "violet" &&
          "border-violet-300/30 bg-violet-300/10 text-violet-100",
        tone === "mint" &&
          "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
        tone === "slate" &&
          "border-slate-600/70 bg-slate-900/70 text-slate-300"
      )}
    >
      {children}
    </span>
  );
}
