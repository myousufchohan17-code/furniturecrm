import type { ReactNode } from "react";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gold/40 bg-cream/50 px-5 py-12 text-center">
      <div className="mb-3 h-12 w-12 rounded-full bg-gold/15" />
      <h3 className="font-display text-xl text-wood">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
