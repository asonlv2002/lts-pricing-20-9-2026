// Chạy: pnpm --filter web exec tsx src/lib/history-datetime.test.ts
import assert from 'node:assert/strict';
import {
  dinhDangNgayTaoLichSu,
  msSapXepLichSu,
  msTuLichSu,
} from './history-datetime';

assert.ok(msTuLichSu('2026-08-18T10:30:05.000Z') > 0, 'ISO parse');
assert.ok(msTuLichSu('18/08/2026') > 0, 'dd/mm/yyyy parse');
assert.ok(msTuLichSu('18/08/2026, 14:30:05') > 0, 'dd/mm/yyyy + time parse');

const cu = {
  id: '1',
  date: '01/01/2026',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const moi = {
  id: '2',
  date: '01/01/2026',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-08-18T12:00:00.000Z',
};
assert.ok(msSapXepLichSu(moi) > msSapXepLichSu(cu), 'updatedAt mới hơn → sort trước');

const label = dinhDangNgayTaoLichSu({
  createdAt: '2026-08-18T07:30:05.000Z',
  date: '18/08/2026',
});
assert.ok(/\d{2}\/\d{2}\/\d{4}/.test(label), `có ngày: ${label}`);
assert.ok(/\d{1,2}:\d{2}:\d{2}/.test(label), `có giờ phút giây: ${label}`);

console.log('history-datetime.test.ts: OK');
