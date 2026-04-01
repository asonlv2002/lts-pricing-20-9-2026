// src/lib/db.ts
// ─────────────────────────────────────────────────────────────────────────────
// Server-side JSON file persistence utility.
// Tất cả file I/O đều đi qua module này — không import 'fs' ở nơi khác.
//
// - Write-lock per-file: dùng Promise chain tránh concurrent write corruption.
// - Atomic write: ghi vào .tmp rồi fs.rename (tránh hỏng file khi crash).
// - Auto-init: nếu file chưa tồn tại → tạo với default value từ src/data/.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Material, AppConstants, ProfitRow, HistoryItem, AppUser } from './types';

// ── Password helpers ──────────────────────────────────────────────────────────
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// ── Paths ──────────────────────────────────────────────────────────────────────
const DATA_DIR       = path.join(process.cwd(), 'data');
const HISTORY_FILE   = path.join(DATA_DIR, 'history.json');
const MATERIALS_FILE = path.join(DATA_DIR, 'materials.json');
const CONSTANTS_FILE = path.join(DATA_DIR, 'constants.json');
const PROFIT_FILE    = path.join(DATA_DIR, 'profit-table.json');
const USERS_FILE     = path.join(DATA_DIR, 'users.json');

// ── Per-file write locks (tránh interleaved async writes) ──────────────────────
const writeLocks = new Map<string, Promise<void>>();

function chainLock(filePath: string): Promise<void> {
  const prev = writeLocks.get(filePath) ?? Promise.resolve();
  // Caller waits for what was previously pending
  const next = prev.then(() => {});
  writeLocks.set(filePath, next);
  return prev;
}

// ── Ensure data/ directory exists ─────────────────────────────────────────────
let dirEnsured = false;
async function ensureDataDir(): Promise<void> {
  if (dirEnsured) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  dirEnsured = true;
}

// ── Generic read helper ────────────────────────────────────────────────────────
async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File chưa tồn tại → tạo với fallback value
      await writeJsonDirect(filePath, fallback);
      return fallback;
    }
    throw new Error(`db: failed to read ${path.basename(filePath)}: ${err.message}`);
  }
}

// ── Generic write helper (atomic, không lock — dùng nội bộ khi init) ──────────
async function writeJsonDirect<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmp, filePath);
}

// ── Generic write helper (với lock — dùng cho mọi write từ bên ngoài) ─────────
async function writeJson<T>(filePath: string, data: T): Promise<void> {
  await chainLock(filePath);
  await writeJsonDirect(filePath, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT VALUES — load từ src/data/ seed files lúc runtime
// Dùng require() thay vì import để tránh circular dependency
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultMaterials(): Material[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('../data/materials.json') as Omit<Material, 'pricePerM2'>[];
  return raw.map(m => ({
    ...m,
    pricePerM2: m.pricePerKg * m.thickness * m.density / 1000,
  }));
}

function getDefaultConstants(): AppConstants {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('../data/constants.json') as any;
  return {
    ...raw,
    // colorSetup keys từ JSON là string → ép thành number
    colorSetup: Object.fromEntries(
      Object.entries(raw.colorSetup as Record<string, number>).map(([k, v]) => [Number(k), v])
    ) as Record<number, number>,
  } as AppConstants;
}

function getDefaultProfitTable(): { rows: ProfitRow[]; profitDefault: { col1: number; col2: number } } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('../data/profitTable.json') as any;
  return {
    rows: raw.rows as ProfitRow[],
    profitDefault: raw.profitDefault as { col1: number; col2: number },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

// ── History ───────────────────────────────────────────────────────────────────
export async function readHistory(): Promise<HistoryItem[]> {
  return readJson<HistoryItem[]>(HISTORY_FILE, []);
}

export async function writeHistory(items: HistoryItem[]): Promise<void> {
  await writeJson(HISTORY_FILE, items);
}

// ── Materials ─────────────────────────────────────────────────────────────────
export async function readMaterials(): Promise<Material[]> {
  return readJson<Material[]>(MATERIALS_FILE, getDefaultMaterials());
}

export async function writeMaterials(materials: Material[]): Promise<void> {
  await writeJson(MATERIALS_FILE, materials);
}

// ── Constants ─────────────────────────────────────────────────────────────────
export async function readConstants(): Promise<AppConstants> {
  return readJson<AppConstants>(CONSTANTS_FILE, getDefaultConstants());
}

export async function writeConstants(constants: AppConstants): Promise<void> {
  await writeJson(CONSTANTS_FILE, constants);
}

// ── Profit Table ──────────────────────────────────────────────────────────────
// Giữ nguyên shape { rows, profitDefault } để tương thích với src/lib/data.ts
export async function readProfitTable(): Promise<{ rows: ProfitRow[]; profitDefault: { col1: number; col2: number } }> {
  return readJson(PROFIT_FILE, getDefaultProfitTable());
}

export async function writeProfitTable(
  rows: ProfitRow[],
  profitDefault?: { col1: number; col2: number }
): Promise<void> {
  const current = await readProfitTable();
  await writeJson(PROFIT_FILE, {
    rows,
    profitDefault: profitDefault ?? current.profitDefault,
  });
}

// ── Users ─────────────────────────────────────────────────────────────────────
function getDefaultUsers(): AppUser[] {
  return [
    {
      id: 'U001',
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      displayName: 'Quản trị viên',
      role: 'admin',
      active: true,
      createdAt: '2025-01-01',
    },
  ];
}

export async function readUsers(): Promise<AppUser[]> {
  return readJson<AppUser[]>(USERS_FILE, getDefaultUsers());
}

export async function writeUsers(users: AppUser[]): Promise<void> {
  await writeJson(USERS_FILE, users);
}

// ── Startup initialisation ────────────────────────────────────────────────────
// Gọi một lần khi server khởi động để đảm bảo tất cả file tồn tại.
// Idempotent — an toàn khi gọi nhiều lần.
export async function initDataFiles(): Promise<void> {
  await ensureDataDir();
  await Promise.all([
    readHistory(),      // tạo history.json = [] nếu chưa có
    readMaterials(),    // tạo materials.json = defaults nếu chưa có
    readConstants(),    // tạo constants.json = defaults nếu chưa có
    readProfitTable(),  // tạo profit-table.json = defaults nếu chưa có
    readUsers(),        // tạo users.json = [admin] nếu chưa có
  ]);
}
