export const METRIC_WINDOW_MS = 60_000;
export const MAX_METRIC_SAMPLES = 12;
export const METRIC_POLL_INTERVAL_MS = 5_000;

export type MetricSample = {
  timestamp: string;
  hostCpuPercent: number | null;
  hostMemoryUsedPercent: number | null;
  hostMemoryUsedBytes: number | null;
  hostMemoryTotalBytes: number | null;
  hostFilesystemUsedPercent: number | null;
  hostFilesystemUsedBytes: number | null;
  hostFilesystemSizeBytes: number | null;
  hostLoadAverage1m: number | null;
  containersRunning: number | null;
  containersCpuPercent: number | null;
  containersMemoryWorkingSetBytes: number | null;
  exporters: {
    cadvisorUp: boolean;
    nodeExporterUp: boolean;
  };
};

export function ghepLichSuMetric(
  current: MetricSample[],
  next: MetricSample,
  nowMs = Date.now(),
): MetricSample[] {
  const cutoff = nowMs - METRIC_WINDOW_MS;
  const merged = [...current, next].filter((sample) => {
    const ts = Date.parse(sample.timestamp);
    return Number.isFinite(ts) && ts >= cutoff;
  });
  if (merged.length <= MAX_METRIC_SAMPLES) return merged;
  return merged.slice(merged.length - MAX_METRIC_SAMPLES);
}
