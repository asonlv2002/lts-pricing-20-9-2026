// apps/web/src/lib/ten-hien-thi.ts
// Helper hiển thị tên gọn cho card mobile (3 danh sách qrev).

/** Tên khách hàng "… 3 cụm cuối" — đủ nhận diện trên thẻ hẹp. */
export function rutGonTenKhachHang(ten: string | undefined | null): string {
  const tu = (ten ?? '').split(/\s+/).filter(Boolean);
  if (tu.length === 0) return '—';
  if (tu.length <= 3) return tu.join(' ');
  return `… ${tu.slice(-3).join(' ')}`;
}

/** Avatar chữ cái đầu: 2 chữ cái đầu của 2 từ cuối. */
export function layChuCaiDau(s: string | undefined | null): string {
  return (s ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const MAU_AVATAR = [
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0ea5e9',
  '#65a30d',
];

export function layMauAvatar(s: string | undefined | null): string {
  const chuoi = s ?? '';
  if (!chuoi) return MAU_AVATAR[0];
  return MAU_AVATAR[
    Math.abs([...chuoi].reduce((a, c) => a + c.charCodeAt(0), 0)) %
      MAU_AVATAR.length
  ];
}
