"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import type { ProductionOrder } from "../lib/types";
import { exportLSXtoDOCX } from "../lib/lsxExport";
import { buildLsxHtml } from "../lib/lsxHtml";

interface LsxPreviewModalProps {
  open: boolean;
  onClose: () => void;
  order: ProductionOrder;
  reviewerSignatureDataUrl?: string | null;
}

export default function LsxPreviewModal({ open, onClose, order, reviewerSignatureDataUrl }: LsxPreviewModalProps) {
  const [dangTai, setDangTai] = useState(false);

  const html = useMemo(() => {
    if (!open) return "";
    try {
      return buildLsxHtml(order);
    } catch (e: any) {
      return `<div style="padding:24px;color:#dc2626">Lỗi tạo HTML: ${e?.message || String(e)}</div>`;
    }
  }, [open, order]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const taiDocx = useCallback(async () => {
    setDangTai(true);
    try {
      await exportLSXtoDOCX(order, reviewerSignatureDataUrl);
    } catch (e: any) {
      alert("Lỗi tải DOCX: " + (e?.message || String(e)));
    } finally {
      setDangTai(false);
    }
  }, [order, reviewerSignatureDataUrl]);

  if (!open) return null;

  const title = `LSX ${order.manual.lsxNumber || order.id} · ${order.snapshot.customer || ""}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-[95vw] h-[95vh] max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between shrink-0 px-5 py-3 bg-gray-100 border-b border-gray-300">
          <span className="text-sm font-medium text-gray-700 truncate">
            Review LSX — {title}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={taiDocx}
              disabled={dangTai}
            >
              {dangTai ? "Đang tải..." : "Tải DOCX"}
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-200 p-4">
          <div
            className="lsx-html-host"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
