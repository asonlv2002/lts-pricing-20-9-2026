"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import type { ProductionOrder } from "../lib/types";
import { buildLSXDocxBlob, exportLSXtoDOCX } from "../lib/lsxExport";

interface LsxPreviewModalProps {
  open: boolean;
  onClose: () => void;
  order: ProductionOrder;
}

function safeFn(s: string): string {
  return (s || "unknown").replace(/[<>:"/\\|?*\s]+/g, "_").slice(0, 60);
}

export default function LsxPreviewModal({ open, onClose, order }: LsxPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [dangTai, setDangTai] = useState(false);

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

  // Build DOCX blob (same as export) and render with docx-preview
  useEffect(() => {
    if (!open || !containerRef.current) return;

    let cancelled = false;
    const el = containerRef.current;
    el.innerHTML = "";
    setStatus("loading");
    setErrorMsg("");
    blobRef.current = null;

    (async () => {
      try {
        const blob = await buildLSXDocxBlob(order);
        if (cancelled) return;
        blobRef.current = blob;

        const { renderAsync } = await import("docx-preview");
        if (cancelled || !containerRef.current) return;

        await renderAsync(blob, containerRef.current, undefined, {
          className: "lsx-docx-preview",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
        });
        if (!cancelled) setStatus("ready");
      } catch (e: any) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(e?.message || String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      if (el) el.innerHTML = "";
    };
  }, [open, order.id, order.manual.lsxNumber, order.snapshot.customer]);

  const taiDocx = useCallback(async () => {
    setDangTai(true);
    try {
      if (blobRef.current) {
        const url = URL.createObjectURL(blobRef.current);
        const a = document.createElement("a");
        a.href = url;
        a.download = `LSX_${safeFn(order.manual.lsxNumber || order.id)}_${safeFn(order.snapshot.customer)}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await exportLSXtoDOCX(order);
      }
    } catch (e: any) {
      alert("Lỗi tải DOCX: " + (e?.message || String(e)));
    } finally {
      setDangTai(false);
    }
  }, [order]);

  if (!open) return null;

  const title = `LSX ${order.manual.lsxNumber || order.id} · ${order.snapshot.customer || ""}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-[95vw] h-[95vh] max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between shrink-0 px-5 py-3 bg-gray-100 border-b border-gray-300">
          <span className="text-sm font-medium text-gray-700 truncate">
            Review LSX (DOCX) — {title}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={taiDocx}
              disabled={dangTai || status === "loading"}
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

        <div className="flex-1 overflow-auto bg-gray-200 relative">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 z-10">
              Đang tạo bản xem trước DOCX…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-red-600 z-10 p-4">
              <span>Không render được DOCX: {errorMsg}</span>
              <button
                className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded"
                onClick={taiDocx}
              >
                Tải DOCX thay thế
              </button>
            </div>
          )}
          <div
            ref={containerRef}
            className="lsx-docx-host min-h-full"
            style={{
              padding: "16px 0",
              display: status === "ready" ? "block" : "block",
              opacity: status === "ready" ? 1 : 0.3,
            }}
          />
        </div>

        <style>{`
          .lsx-docx-host .lsx-docx-preview-wrapper {
            background: transparent !important;
            padding: 0 !important;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .lsx-docx-host .lsx-docx-preview {
            background: #fff !important;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
            margin: 0 auto !important;
          }
          .lsx-docx-host .lsx-docx-preview section.lsx-docx-preview {
            box-sizing: border-box;
          }
        `}</style>
      </div>
    </div>
  );
}
