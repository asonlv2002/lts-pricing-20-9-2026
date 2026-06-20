import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');
const ALLOWED_FILES = new Set([
  join(ROOT, 'lib', 'vai-tro-terminology.test.ts'),
]);

const FORBIDDEN_PATTERNS = [
  /nhóm quyền/iu,
  /NhomQuyen/u,
  /nhomQuyen/u,
  /NHOM_QUYEN/u,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    if (!/\.(ts|tsx)$/.test(path)) return [];
    return [path];
  });
}

const violations = walk(ROOT)
  .filter((path) => !ALLOWED_FILES.has(path))
  .flatMap((path) => {
    const content = readFileSync(path, 'utf8');
    return FORBIDDEN_PATTERNS
      .filter((pattern) => pattern.test(content))
      .map((pattern) => `${path.replace(process.cwd() + '\\', '')}: ${pattern}`);
  });

if (violations.length > 0) {
  console.error('Forbidden “nhóm quyền” terminology found. Use “vai trò” instead:');
  violations.forEach((violation) => console.error(`  - ${violation}`));
  process.exit(1);
}

console.log('Vai trò terminology OK');
