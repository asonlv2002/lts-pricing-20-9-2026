"use client";

// apps/web/src/components/AvatarNguoiLap.tsx
// Avatar người lập cho card mobile: chỉ hiện avatar; chạm → box tên;
// chạm bất kỳ đâu khác → đóng. Mỗi danh sách giữ state "1 tooltip mở".

import { AvatarBlobImg } from "../lib/avatar-blob-cache";
import { layChuCaiDau, layMauAvatar } from "../lib/ten-hien-thi";

interface AvatarNguoiLapProps {
  ten: string | undefined | null;
  avatarUrl?: string | null;
  accessToken: string | null | undefined;
  /** id của dòng đang mở tooltip (module quản lý). */
  id: string;
  idDangMo: string | null;
  onCham: (id: string | null) => void;
}

export default function AvatarNguoiLap({
  ten,
  avatarUrl,
  accessToken,
  id,
  idDangMo,
  onCham,
}: AvatarNguoiLapProps) {
  if (!ten) return <span className="qrev-mavatar-empty">—</span>;
  const dangMo = idDangMo === id;
  return (
    <span
      className={`qrev-mavatar-wrap${dangMo ? " is-open" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="qrev-mavatar"
        aria-label={`Xem tên người lập: ${ten}`}
        aria-expanded={dangMo}
        onClick={() => onCham(dangMo ? null : id)}
      >
        {avatarUrl ? (
          <AvatarBlobImg
            actorAvatarUrl={avatarUrl}
            accessToken={accessToken}
            alt={ten}
            className="qrev-user-avatar qrev-mavatar-img"
            style={{ objectFit: "cover", background: "transparent" }}
          />
        ) : (
          <span
            className="qrev-user-avatar"
            style={{ background: layMauAvatar(ten) }}
          >
            {layChuCaiDau(ten)}
          </span>
        )}
      </button>
      {dangMo && (
        <>
          <span
            className="qrev-mavatar-backdrop"
            aria-hidden
            onClick={() => onCham(null)}
          />
          <span className="qrev-mavatar-tip" role="tooltip">
            {ten}
          </span>
        </>
      )}
    </span>
  );
}
