import { Modal } from "./Modal";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="mb-6 text-sm leading-6 text-muted">{message}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
