import type { ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  cancelText = "取消",
  confirmText = "确认",
  confirmVariant = "danger",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  cancelText?: string;
  confirmText?: string;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const confirmClass =
    confirmVariant === "danger"
      ? "admin-btn bg-red-500/90 hover:bg-red-500 text-white border border-red-400/40"
      : "admin-btn admin-btn-primary";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl admin-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--line)]">
            <div className="text-[var(--gold-2)] font-semibold">{title}</div>
          </div>
          <div className="px-5 py-4 text-sm text-[var(--muted)] leading-relaxed">{description}</div>
          <div className="px-5 py-4 border-t border-[var(--line)] flex items-center justify-end gap-2">
            <button className="admin-btn admin-btn-ghost" onClick={onCancel}>
              {cancelText}
            </button>
            <button className={confirmClass} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

