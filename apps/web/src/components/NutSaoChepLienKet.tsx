"use client";

import React, { useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { saoChepVaoClipboard } from "../lib/support-route";
import { hienToast } from "../lib/toast";

type Variant = "qrev" | "crm2";

/**
 * Nút icon copy deep-link URL — style đồng bộ qrev / crm2.
 * Toast trượt từ bên phải khi copy thành công.
 */
export default function NutSaoChepLienKet({
  url,
  variant = "qrev",
  size = 15,
  className = "",
  titleMacDinh = "Sao chép liên kết",
  titleDaChep = "Đã sao chép!",
}: {
  url: string | null | undefined;
  variant?: Variant;
  size?: number;
  className?: string;
  titleMacDinh?: string;
  titleDaChep?: string;
}) {
  const [daChep, setDaChep] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!url?.trim()) return null;

  const baseClass = variant === "crm2" ? "crm2-btn-icon" : "qrev-btn-icon";

  const xuLy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await saoChepVaoClipboard(url);
    if (!ok) {
      hienToast("Không sao chép được liên kết.", { loai: "error" });
      return;
    }
    setDaChep(true);
    hienToast("Đã sao chép liên kết", { loai: "success", ms: 2500 });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDaChep(false), 1500);
  };

  return (
    <button
      type="button"
      className={`${baseClass} ${className}`.trim()}
      title={daChep ? titleDaChep : titleMacDinh}
      aria-label={daChep ? titleDaChep : titleMacDinh}
      onClick={(e) => void xuLy(e)}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {daChep ? <Check size={size} /> : <Link2 size={size} />}
    </button>
  );
}
