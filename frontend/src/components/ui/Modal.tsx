import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  children,
  onClose,
  wide,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-wood-deep/45 p-3 sm:items-center">
      <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-linen p-5 shadow-2xl sm:p-6 ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-wood">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-cream-deep"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
