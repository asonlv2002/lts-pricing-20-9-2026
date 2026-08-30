'use client';

import { useCallback, useRef, useState } from 'react';

const PIN_HUY_MSG = 'Đã hủy xác nhận mã PIN.';

/** True nếu lỗi từ prompt là do user chủ động hủy (đóng modal PIN). */
export function laHuyPin(err: unknown): boolean {
  return err instanceof Error && err.message === PIN_HUY_MSG;
}

type NhapPinPending = {
  title: string;
  message: string;
  resolve: (pinToken: string) => void;
  reject: (reason?: unknown) => void;
};

/**
 * Prompt mã PIN dạng Promise — dùng cho các luồng async tuần tự
 * (ví dụ lưu báo giá rồi mới gửi duyệt): `await promptPin(...)` trả về
 * pinToken khi user xác nhận, hoặc reject khi user hủy.
 *
 * Cách dùng:
 *   const pin = useNhapPinPrompt();
 *   ...
 *   const token = await pin.promptPin('Gửi duyệt', 'Nhập mã PIN để xác nhận...');
 *   ...
 *   <NhapPinDuyetModal
 *     open={pin.open}
 *     title={pin.title}
 *     message={pin.message}
 *     onConfirm={pin.confirm}
 *     onClose={pin.cancel}
 *   />
 */
export function useNhapPinPrompt() {
  const [pending, setPending] = useState<NhapPinPending | null>(null);
  const pendingRef = useRef<NhapPinPending | null>(null);

  const promptPin = useCallback(
    (title: string, message: string): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        const p: NhapPinPending = { title, message, resolve, reject };
        pendingRef.current = p;
        setPending(p);
      }),
    [],
  );

  const confirm = useCallback((pinToken: string) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.resolve(pinToken);
  }, []);

  const cancel = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.reject(new Error(PIN_HUY_MSG));
  }, []);

  return {
    open: !!pending,
    title: pending?.title ?? '',
    message: pending?.message ?? '',
    promptPin,
    confirm,
    cancel,
  };
}