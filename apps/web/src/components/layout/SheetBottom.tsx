"use client";

// apps/web/src/components/layout/SheetBottom.tsx
import { X } from "lucide-react";
import { useEffect } from "react";

interface SheetBottomProps {
  open: boolean;
  dong: () => void;
  tieuDe: string;
  children: React.ReactNode;
  nutDauTieuDe?: React.ReactNode;
}

export default function SheetBottom({
  open,
  dong,
  tieuDe,
  children,
  nutDauTieuDe,
}: SheetBottomProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, dong]);

  if (!open) return null;
  return (
    <div className="lts-sheet-backdrop" onClick={dong} role="presentation">
      <div
        className="lts-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={tieuDe}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="lts-sheet-grabber" aria-hidden />
        <div className="lts-sheet-head">
          <strong>{tieuDe}</strong>
          <div className="lts-sheet-head-actions">
            {nutDauTieuDe}
            <button
              type="button"
              className="lts-sheet-close"
              onClick={dong}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="lts-sheet-body">{children}</div>
      </div>
    </div>
  );
}
