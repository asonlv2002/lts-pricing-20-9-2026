"use client";

// apps/web/src/components/LocSheet.tsx
// Bọc thanh lọc danh sách: desktop render children nguyên trạng;
// mobile (<768) chỉ hiện nút "⚙ Bộ lọc" (+badge), mở bottom sheet chứa đúng JSX lọc cũ.
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import SheetBottom from "@/components/layout/SheetBottom";
import { useIsMobile } from "@/lib/use-is-mobile";

interface LocSheetProps {
  children: React.ReactNode;
  soLuongLoc?: number;
  title?: string;
}

export default function LocSheet({
  children,
  soLuongLoc = 0,
  title = "Bộ lọc",
}: LocSheetProps) {
  const laMobile = useIsMobile();
  const [mo, setMo] = useState(false);

  if (!laMobile) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        className="lts-loc-open"
        onClick={() => setMo(true)}
        aria-expanded={mo}
        aria-label="Mở bộ lọc"
      >
        <SlidersHorizontal size={15} />
        <span>Bộ lọc</span>
        {soLuongLoc > 0 && (
          <span className="lts-loc-open-badge">{soLuongLoc}</span>
        )}
      </button>
      <SheetBottom open={mo} dong={() => setMo(false)} tieuDe={title}>
        <div className="lts-loc-sheet-body">{children}</div>
      </SheetBottom>
    </>
  );
}
