// ═══════════════════════════════════════════════════════════════════════════
// Chữ ký vẽ — helper thuần cho vùng vẽ chữ ký 512×512 (canvas trong modal).
// - Scale tọa độ pointer (CSS px) → canvas 512 px thật.
// - Quản lý danh sách nét vẽ (stroke): thêm / undo / xóa hết.
// - Export canvas thành File PNG để gửi lên server (backend tự encode WebP).
// ═══════════════════════════════════════════════════════════════════════════
export const CHU_KY_CANVAS_SIZE = 512;
export const CHU_KY_NET_DAY = 4;
export const CHU_KY_MIME = "image/png";

export interface DiemVe {
  x: number; // canvas px (0..512)
  y: number;
}

export interface NetVe {
  points: DiemVe[];
}

/** Scale tọa độ pointer (CSS) sang tọa độ canvas 512. */
export function doiTọaĐộ(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): DiemVe {
  const x = ((clientX - rect.left) / rect.width) * CHU_KY_CANVAS_SIZE;
  const y = ((clientY - rect.top) / rect.height) * CHU_KY_CANVAS_SIZE;
  return {
    x: Math.max(0, Math.min(CHU_KY_CANVAS_SIZE, x)),
    y: Math.max(0, Math.min(CHU_KY_CANVAS_SIZE, y)),
  };
}

/** Vẽ lại toàn bộ stroke lên canvas (nền trắng, mực đen). */
export function veLaiCanvas(
  canvas: HTMLCanvasElement,
  strokes: NetVe[],
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, CHU_KY_CANVAS_SIZE, CHU_KY_CANVAS_SIZE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CHU_KY_CANVAS_SIZE, CHU_KY_CANVAS_SIZE);
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = CHU_KY_NET_DAY;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    if (!stroke || stroke.points.length === 0) continue;
    if (stroke.points.length === 1) {
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, CHU_KY_NET_DAY / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
}

/** Export nội dung canvas hiện tại thành File PNG (rỗng → null). */
export function canvasSangFile(canvas: HTMLCanvasElement): Promise<File | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], "chu-ky-ve.png", { type: CHU_KY_MIME }));
    }, CHU_KY_MIME);
  });
}
