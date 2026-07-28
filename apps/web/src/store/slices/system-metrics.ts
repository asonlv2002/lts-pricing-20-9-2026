import type { StateCreator } from 'zustand';
import { layMetricHeThongService, type SystemMetricSnapshotApi } from '../../lib/api/service-lts';
import {
  ghepLichSuMetric,
  METRIC_POLL_INTERVAL_MS,
  type MetricSample,
} from '../../lib/system-metrics-history';
import type { CuaHangTinhGia } from '../CuaHangTinhGia';

export interface SystemMetricsSlice {
  lichSuMetricHeThong: MetricSample[];
  metricHeThongDangTai: boolean;
  metricHeThongLoi: string | null;
  taiMetricHeThong: () => Promise<void>;
  batDauTheoDoiMetricHeThong: () => void;
  dungTheoDoiMetricHeThong: () => void;
}

let interval: ReturnType<typeof setInterval> | null = null;
let requestDangChay: Promise<void> | null = null;

function chuyenSnapshot(snapshot: SystemMetricSnapshotApi): MetricSample {
  return {
    timestamp: snapshot.timestamp,
    hostCpuPercent: snapshot.host.cpuUsagePercent,
    hostMemoryUsedPercent: snapshot.host.memoryUsedPercent,
    hostMemoryUsedBytes: snapshot.host.memoryUsedBytes,
    hostMemoryTotalBytes: snapshot.host.memoryTotalBytes,
    hostFilesystemUsedPercent: snapshot.host.filesystemUsedPercent,
    hostFilesystemUsedBytes: snapshot.host.filesystemUsedBytes,
    hostFilesystemSizeBytes: snapshot.host.filesystemSizeBytes,
    hostLoadAverage1m: snapshot.host.loadAverage1m,
    containersRunning: snapshot.containers.running,
    containersCpuPercent: snapshot.containers.cpuUsagePercent,
    containersMemoryWorkingSetBytes: snapshot.containers.memoryWorkingSetBytes,
    exporters: {
      cadvisorUp: snapshot.exporters.cadvisor.up,
      nodeExporterUp: snapshot.exporters.nodeExporter.up,
    },
  };
}

export const createSystemMetricsSlice: StateCreator<
  CuaHangTinhGia,
  [],
  [],
  SystemMetricsSlice
> = (set, get) => ({
  lichSuMetricHeThong: [],
  metricHeThongDangTai: false,
  metricHeThongLoi: null,

  taiMetricHeThong: async () => {
    if (requestDangChay) return requestDangChay;
    if (!get().nguoiDungHienTai?.policies.includes('SYSTEM_MONITOR')) return;

    set({ metricHeThongDangTai: true });
    requestDangChay = (async () => {
      try {
        const snapshot = await layMetricHeThongService();
        const sample = chuyenSnapshot(snapshot);
        set((state) => ({
          lichSuMetricHeThong: ghepLichSuMetric(state.lichSuMetricHeThong, sample),
          metricHeThongLoi: null,
        }));
      } catch (error) {
        set({
          metricHeThongLoi:
            error instanceof Error ? error.message : 'Không thể cập nhật tài nguyên hệ thống.',
        });
      } finally {
        set({ metricHeThongDangTai: false });
        requestDangChay = null;
      }
    })();
    return requestDangChay;
  },

  batDauTheoDoiMetricHeThong: () => {
    if (!get().nguoiDungHienTai?.policies.includes('SYSTEM_MONITOR')) {
      get().dungTheoDoiMetricHeThong();
      return;
    }
    if (interval) return;
    void get().taiMetricHeThong();
    interval = setInterval(() => void get().taiMetricHeThong(), METRIC_POLL_INTERVAL_MS);
  },

  dungTheoDoiMetricHeThong: () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    requestDangChay = null;
    set({
      lichSuMetricHeThong: [],
      metricHeThongDangTai: false,
      metricHeThongLoi: null,
    });
  },
});
