import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-xl admin-panel overflow-hidden max-h-[90svh] flex flex-col">
          <div className="shrink-0 flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
            <div className="font-semibold text-[var(--gold-2)]">{title}</div>
            <button className="text-[var(--muted)] hover:text-[var(--text)] whitespace-nowrap shrink-0" onClick={onClose}>
              关闭
            </button>
          </div>
          <div className="p-5 overflow-auto min-h-0">{children}</div>
          {footer && (
            <div className="shrink-0 border-t border-[var(--line)] px-5 py-4 flex flex-wrap items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
