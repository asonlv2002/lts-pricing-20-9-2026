/** Toast trượt từ bên phải — dùng #toastContainer trong VoTrang. */

export type LoaiToast = "default" | "success" | "error" | "info";

export function hienToast(
  noiDung: string,
  options?: { loai?: LoaiToast; ms?: number },
): void {
  if (typeof document === "undefined") return;
  const text = noiDung.trim();
  if (!text) return;

  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const loai = options?.loai ?? "success";
  const ms = options?.ms ?? 2800;
  const toast = document.createElement("div");
  toast.className = `toast${loai !== "default" ? ` toast-${loai}` : ""}`;
  toast.textContent = text;
  // animationOut timing khớp globals.css (~3.7s default) — override khi ms khác
  toast.style.animation = `toastIn 0.35s cubic-bezier(0.4,0,0.2,1), toastOut 0.3s ease ${Math.max(0.5, ms / 1000 - 0.3)}s forwards`;
  container.appendChild(toast);
  window.setTimeout(() => toast.remove(), ms + 400);
}
