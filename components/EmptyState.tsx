type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="w-full rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h2 className="font-[var(--font-space)] text-2xl font-semibold text-slate-950">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      {action ? (
        <div className="mt-6 inline-flex rounded-md border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100">
          {action}
        </div>
      ) : null}
    </div>
  );
}
