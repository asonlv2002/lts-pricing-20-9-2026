"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ProductionOrder } from "../lib/types";
import { LsxPdfDocument, lsxPdfFileName } from "./LsxPdfDocument";
import StablePdfIframe from "./pdf/StablePdfIframe";

interface LsxPdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  order: ProductionOrder;
}

function lsxPdfDepsKey(order: ProductionOrder): string {
  const num = order.manual?.lsxNumber || "";
  const updated =
    (order as { updatedAt?: string }).updatedAt || order.createdAt || "";
  return `lsx:${order.id}|${num}|${updated}`;
}

function LsxPdfPreviewModal({
  open,
  onClose,
  order,
}: LsxPdfPreviewModalProps) {
  const [dangTai, setDangTai] = useState(false);
  const readyRef = useRef<{ blob: Blob; url: string } | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;

  const depsKey = open ? lsxPdfDepsKey(order) : "";

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

  const buildDocument = useCallback(
    () => <LsxPdfDocument order={orderRef.current} />,
    [],
  );

  const onReady = useCallback(
    (payload: { blob: Blob; url: string } | null) => {
      readyRef.current = payload;
    },
    [],
  );

  const taiPdf = useCallback(async () => {
    setDangTai(true);
    try {
      let blob = readyRef.current?.blob;
      if (!blob) {
        const { pdf } = await import("@react-pdf/renderer");
        blob = await pdf(<LsxPdfDocument order={order} />).toBlob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = lsxPdfFileName(order);
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Lỗi tải PDF: " + msg);
    } finally {
      setDangTai(false);
    }
  }, [order]);

  if (!open) return null;

  const title = `LSX ${order.manual.lsxNumber || order.id} · ${order.snapshot.customer || ""}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex flex-col w-[95vw] h-[95vh] max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between shrink-0 px-5 py-3 bg-gray-100 border-b border-gray-300">
          <span className="text-sm font-medium text-gray-700 truncate">
            Review LSX (PDF) — {title}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={taiPdf}
              disabled={dangTai}
            >
              {dangTai ? "Đang tạo PDF..." : "Tải PDF"}
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <StablePdfIframe
            active={open}
            depsKey={depsKey}
            buildDocument={buildDocument}
            onReady={onReady}
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(LsxPdfPreviewModal);
