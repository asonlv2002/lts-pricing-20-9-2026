/**
 * system-metrics-history.test.ts - buffer 60s / 12 samples.
 * Chay: pnpm --filter web exec tsx src/lib/system-metrics-history.test.ts
 */
import {
  ghepLichSuMetric,
  MAX_METRIC_SAMPLES,
  METRIC_WINDOW_MS,
  type MetricSample,
} from './system-metrics-history';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`  OK ${name}`);
    passed++;
  } else {
    console.error(`  FAIL ${name}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

function sample(ts: number, cpu = 10): MetricSample {
  return {
    timestamp: new Date(ts).toISOString(),
    hostCpuPercent: cpu,
    hostMemoryUsedPercent: 40,
    hostMemoryUsedBytes: 4,
    hostMemoryTotalBytes: 10,
    hostFilesystemUsedPercent: 30,
    hostFilesystemUsedBytes: 3,
    hostFilesystemSizeBytes: 10,
    hostLoadAverage1m: 0.5,
    containersRunning: 2,
    containersCpuPercent: 5,
    containersMemoryWorkingSetBytes: 1,
    exporters: {
      cadvisorUp: true,
      nodeExporterUp: true,
    },
  };
}

console.log('\n== Metric history buffer ==');

const now = Date.UTC(2026, 6, 29, 12, 0, 0);
const old = ghepLichSuMetric([], sample(now - METRIC_WINDOW_MS - 1), now);
assert('drops samples older than 60s', old.length === 0, String(old.length));

const kept = ghepLichSuMetric([], sample(now - 5_000), now);
assert('keeps samples within 60s', kept.length === 1, String(kept.length));

let many: MetricSample[] = [];
for (let i = 0; i < 20; i += 1) {
  many = ghepLichSuMetric(many, sample(now - (19 - i) * 5_000, i), now);
}
assert('caps at 12 samples', many.length === MAX_METRIC_SAMPLES, String(many.length));
assert(
  'keeps newest samples when capped',
  many[0]?.hostCpuPercent === 8 && many[11]?.hostCpuPercent === 19,
  JSON.stringify(many.map((s) => s.hostCpuPercent)),
);

console.log(`\nPassed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
