"use client";

import React from "react";
import { Activity, Box, HardDrive, MemoryStick, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { dungCuaHangTinhGia } from "../store/CuaHangTinhGia";
import type { MetricSample } from "../lib/system-metrics-history";

const dinhDangByte = (value: number | null) => {
  if (value === null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${units[index]}`;
};

const dinhDangPhanTram = (value: number | null) =>
  value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;

function ThanhTienTrinh({ value }: { value: number | null }) {
  const safeValue = value === null ? 0 : Math.max(0, Math.min(value, 100));
  return (
    <div className="sysmon-progress" aria-label={`Mức sử dụng ${dinhDangPhanTram(value)}`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function BieuDo({ title, value, history, color }: {
  title: string;
  value: number | null;
  history: MetricSample[];
  color: "blue" | "violet";
}) {
  const values = history.map((sample) => color === "blue" ? sample.hostCpuPercent : sample.hostMemoryUsedPercent);
  const points = values.map((item, index) => {
    const x = values.length <= 1 ? 100 : (index / (values.length - 1)) * 100;
    const y = item === null ? 100 : 100 - Math.max(0, Math.min(item, 100));
    return `${x},${y}`;
  }).join(" ");
  const area = points ? `0,100 ${points} 100,100` : "";
  const mocThoiGian = [-60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 0];

  return (
    <section className={`sysmon-chart sysmon-chart--${color}`}>
      <header>
        <div>
          <span className="sysmon-eyebrow">60 GIÂY GẦN NHẤT</span>
          <h2>{title}</h2>
        </div>
        <strong>{dinhDangPhanTram(value)}</strong>
      </header>
      <div className="sysmon-chart-grid" aria-label={`${title} 60 giây gần nhất`}>
        <span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
          {area && <polygon points={area} />}
          {points && <polyline points={points} />}
        </svg>
      </div>
      <footer className="sysmon-chart-timeline">
        {mocThoiGian.map((moc) => (
          <span key={moc}>{moc === 0 ? "Hiện tại" : `${moc}s`}</span>
        ))}
      </footer>
    </section>
  );
}

export default function ModuleTaiNguyenHeThong() {
  const history = dungCuaHangTinhGia((state) => state.lichSuMetricHeThong);
  const dangTai = dungCuaHangTinhGia((state) => state.metricHeThongDangTai);
  const loi = dungCuaHangTinhGia((state) => state.metricHeThongLoi);
  const taiLai = dungCuaHangTinhGia((state) => state.taiMetricHeThong);
  const latest = history.at(-1);

  return (
    <main className="sysmon-root">
      <header className="sysmon-header">
        <div>
          <p className="sysmon-eyebrow">GIÁM SÁT VPS</p>
          <h1>Quản lý tài nguyên hệ thống</h1>
          <p>Theo dõi tài nguyên VPS theo thời gian thực · làm mới mỗi 5 giây</p>
        </div>
        <button className="sysmon-refresh" type="button" onClick={() => void taiLai()} disabled={dangTai}>
          <RefreshCw size={16} className={dangTai ? "um-spin" : ""} /> Làm mới
        </button>
      </header>

      {loi && <div className="sysmon-error" role="alert"><TriangleAlert size={17} /> {loi}</div>}

      <section className="sysmon-summary-grid">
        <article className="sysmon-stat-card sysmon-stat-card--disk">
          <HardDrive size={20} /><span className="sysmon-eyebrow">Ổ ĐĨA HỆ THỐNG</span>
          <strong>{dinhDangByte(latest?.hostFilesystemUsedBytes ?? null)} <small>/ {dinhDangByte(latest?.hostFilesystemSizeBytes ?? null)}</small></strong>
          <ThanhTienTrinh value={latest?.hostFilesystemUsedPercent ?? null} />
          <p>{dinhDangPhanTram(latest?.hostFilesystemUsedPercent ?? null)} đã sử dụng</p>
        </article>
        <article className="sysmon-stat-card sysmon-stat-card--memory">
          <MemoryStick size={20} /><span className="sysmon-eyebrow">BỘ NHỚ RAM</span>
          <strong>{dinhDangByte(latest?.hostMemoryUsedBytes ?? null)} <small>/ {dinhDangByte(latest?.hostMemoryTotalBytes ?? null)}</small></strong>
          <ThanhTienTrinh value={latest?.hostMemoryUsedPercent ?? null} />
          <p>{dinhDangPhanTram(latest?.hostMemoryUsedPercent ?? null)} đã sử dụng</p>
        </article>
        <article className="sysmon-stat-card sysmon-stat-card--container">
          <Box size={20} /><span className="sysmon-eyebrow">CONTAINER</span>
          <strong>{latest?.containersRunning ?? "—"} <small>đang hoạt động</small></strong>
          <dl><div><dt>CPU tổng</dt><dd>{dinhDangPhanTram(latest?.containersCpuPercent ?? null)}</dd></div><div><dt>RAM tổng</dt><dd>{dinhDangByte(latest?.containersMemoryWorkingSetBytes ?? null)}</dd></div></dl>
        </article>
      </section>

      <section className="sysmon-chart-grid-wrap">
        <BieuDo title="CPU VPS" value={latest?.hostCpuPercent ?? null} history={history} color="blue" />
        <BieuDo title="RAM VPS" value={latest?.hostMemoryUsedPercent ?? null} history={history} color="violet" />
      </section>

      <footer className="sysmon-footer">
        <span><Activity size={16} /> Load trung bình 1 phút: <b>{latest?.hostLoadAverage1m ?? "—"}</b></span>
        <span><Server size={16} /> cAdvisor: <b className={latest?.exporters.cadvisorUp ? "is-up" : "is-down"}>{latest?.exporters.cadvisorUp ? "Hoạt động" : "Không phản hồi"}</b></span>
        <span><Server size={16} /> node-exporter: <b className={latest?.exporters.nodeExporterUp ? "is-up" : "is-down"}>{latest?.exporters.nodeExporterUp ? "Hoạt động" : "Không phản hồi"}</b></span>
      </footer>
    </main>
  );
}
