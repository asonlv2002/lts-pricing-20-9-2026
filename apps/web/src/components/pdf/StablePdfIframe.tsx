"use client";

import React, { useEffect, useRef, useState } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";

type PdfDocElement = React.ReactElement<DocumentProps>;

export type StablePdfIframeProps = {
  /** Bật khi modal mở — false thì không gen / revoke URL. */
  active: boolean;
  /**
   * Key ổn định theo nội dung PDF (id đơn, quoteCode…).
   * Đổi key → gen lại 1 lần. Không đổi → giữ blob, không reload iframe.
   */
  depsKey: string;
  /** Factory: chỉ gọi khi cần gen (mở / đổi key), không gọi mỗi render parent. */
  buildDocument: () => PdfDocElement;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Nhận blob/url sau khi gen xong (tải file tái dùng, không gen lần 2).
   * Gọi lại với null khi unmount / đổi key / inactive.
   */
  onReady?: (payload: { blob: Blob; url: string } | null) => void;
};

/**
 * Preview PDF ổn định: gen blob 1 lần theo depsKey, gắn iframe src cố định.
 * Tránh PDFViewer (useEffect deps = children) gen lại mỗi lần parent re-render
 * → giật màn, scroll về đầu, network lặp.
 */
export default function StablePdfIframe({
  active,
  depsKey,
  buildDocument,
  title = "PDF preview",
  className,
  style,
  onReady,
}: StablePdfIframeProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRef = useRef(buildDocument);
  buildRef.current = buildDocument;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !depsKey) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      setLoading(false);
      setError(null);
      onReadyRef.current?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const blob = await pdf(buildRef.current()).toBlob();
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
        onReadyRef.current?.({ blob, url: next });
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Không tạo được PDF");
        onReadyRef.current?.(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, depsKey]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      onReadyRef.current?.(null);
    };
  }, []);

  if (error) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          color: "#dc2626",
          fontSize: 14,
          ...style,
        }}
      >
        Lỗi tạo PDF: {error}
      </div>
    );
  }

  if (loading || !url) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          color: "#6b7280",
          fontSize: 14,
          ...style,
        }}
      >
        Đang tạo PDF…
      </div>
    );
  }

  return (
    <iframe
      title={title}
      src={`${url}#toolbar=0`}
      className={className}
      style={{ border: "none", width: "100%", height: "100%", ...style }}
    />
  );
}
