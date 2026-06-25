import { clsx } from "@/lib/utils";

type TagBadgeProps = {
  children: React.ReactNode;
  tone?: "cyan" | "violet" | "slate" | "mint" | "amber" | "rose";
};

export function TagBadge({ children, tone = "slate" }: TagBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
        tone === "cyan" &&
          "border-blue-200 bg-blue-50 text-blue-700",
        tone === "violet" &&
          "border-violet-200 bg-violet-50 text-violet-700",
        tone === "mint" &&
          "border-lime-200 bg-lime-50 text-lime-700",
        tone === "amber" &&
          "border-amber-200 bg-amber-50 text-amber-700",
        tone === "rose" &&
          "border-pink-200 bg-pink-50 text-pink-700",
        tone === "slate" &&
          "border-slate-200 bg-slate-50 text-slate-600"
      )}
    >
      {children}
    </span>
  );
}
