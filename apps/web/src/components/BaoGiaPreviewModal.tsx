"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BaoGiaPdfDocument } from "./BaoGiaPdfDocument";
import StablePdfIframe from "./pdf/StablePdfIframe";
import type { HistoryItem } from "../lib/types";

interface BaoGiaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  item: HistoryItem;
  customerInfo?: {
    address?: string;
    taxCode?: string;
    phone?: string;
    fax?: string;
    description?: string;
  };
  reviewerSignatureDataUrl?: string | null;
}

export function baoGiaPdfDepsKey(
  item: HistoryItem,
  customerInfo?: BaoGiaPreviewModalProps["customerInfo"],
  reviewerSignatureDataUrl?: string | null,
): string {
  const id =
    item.id ||
    item.quoteCode ||
    `${item.customer || ""}|${item.productName || ""}|${item.date || ""}`;
  const ci = customerInfo
    ? [
        customerInfo.address || "",
        customerInfo.taxCode || "",
        customerInfo.phone || "",
        customerInfo.fax || "",
        customerInfo.description || "",
      ].join("|")
    : "";
  return `bg:${id}:${ci}:sig:${reviewerSignatureDataUrl ? "1" : "0"}`;
}

function BaoGiaPreviewModal({
  open,
  onClose,
  item,
  customerInfo,
  reviewerSignatureDataUrl,
}: BaoGiaPreviewModalProps) {
  const [dangTai, setDangTai] = useState(false);
  const readyRef = useRef<{ blob: Blob; url: string } | null>(null);
  const itemRef = useRef(item);
  const customerInfoRef = useRef(customerInfo);
  const reviewerSignatureDataUrlRef = useRef(reviewerSignatureDataUrl);
  useEffect(() => {
    itemRef.current = item;
    customerInfoRef.current = customerInfo;
    reviewerSignatureDataUrlRef.current = reviewerSignatureDataUrl;
  }, [item, customerInfo, reviewerSignatureDataUrl]);

  const depsKey = open
    ? baoGiaPdfDepsKey(item, customerInfo, reviewerSignatureDataUrl)
    : "";

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
    () => (
      <BaoGiaPdfDocument
        item={itemRef.current}
        customerInfo={customerInfoRef.current}
        reviewerSignatureDataUrl={reviewerSignatureDataUrlRef.current}
      />
    ),
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
        blob = await pdf(
          <BaoGiaPdfDocument item={item} customerInfo={customerInfo} reviewerSignatureDataUrl={reviewerSignatureDataUrl} />,
        ).toBlob();
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = (item.quoteCode || item.customer || "bao-gia")
        .replace(/[<>:"/\\|?*\s]+/g, "_")
        .slice(0, 60);
      a.href = url;
      a.download = `BaoGia_${safeName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Lỗi tải PDF: " + msg);
    } finally {
      setDangTai(false);
    }
  }, [item, customerInfo, reviewerSignatureDataUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 flex flex-col w-[95vw] h-[95vh] max-w-5xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between shrink-0 px-5 py-3 bg-gray-100 border-b border-gray-300">
          <span className="text-sm font-medium text-gray-700 truncate">
            Bảng báo giá {item.quoteCode || item.customer || ""}
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
            title={`Báo giá ${item.quoteCode || item.customer || ""}`}
          />
        </div>
      </div>
    </div>
  );
}

export default React.memo(BaoGiaPreviewModal);
