type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="w-full rounded-lg border border-dashed border-slate-600 bg-slate-950/45 p-8 text-center">
      <h2 className="font-[var(--font-space)] text-2xl font-semibold text-white">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
        {description}
      </p>
      {action ? (
        <div className="mt-6 inline-flex rounded-md border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
          {action}
        </div>
      ) : null}
    </div>
  );
}
