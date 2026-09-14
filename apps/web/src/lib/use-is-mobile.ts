"use client";

// apps/web/src/lib/use-is-mobile.ts
import { useEffect, useState } from "react";

const TRUY_VAN = "(max-width: 767px)";

export function useIsMobile(): boolean {
  const [laMobile, setLaMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(TRUY_VAN);
    setLaMobile(mq.matches);
    const onThayDoi = (e: MediaQueryListEvent) => setLaMobile(e.matches);
    mq.addEventListener("change", onThayDoi);
    return () => mq.removeEventListener("change", onThayDoi);
  }, []);
  return laMobile;
}
