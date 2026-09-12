import type { ReactNode } from "react";

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-wood">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}

export const fieldClass =
  "w-full rounded-xl border border-cream-deep bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";
