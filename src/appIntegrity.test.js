/**
 * Repo integrity guard — the "no fake data" project promise.
 *
 * PinPoint must never render sample/mock reports to users: every report
 * visible in the app has to come from a real submission (Firestore or the
 * user's own localStorage). This test statically enforces the promise by
 * scanning all application source files (and the HTML entry point) for any
 * import of `src/data/mockData.js`, which exists only as build-time
 * reference material.
 *
 * Corresponds to QA smoke test SMK-05 and §9.1 of docs/_qa-checklist.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');
const ENTRY_FILES = [join(process.cwd(), 'index.html')];
const SCANNABLE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.html']);
const MOCK_DATA_PATH = join(SRC_ROOT, 'data', 'mockData.js');

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (SCANNABLE_EXTENSIONS.has(extname(entry)) && !/\.test\.[jt]sx?$/.test(entry)) {
      files.push(full); // *.test.* files are QA tooling, not shipped app code
    }
  }
  return files;
}

// Matches: import x from '...mockData...' · import '...mockData...'
//          import('...mockData...') · require('...mockData...')
//          <script src="...mockData...">
const MOCK_IMPORT_PATTERN = /(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+|src\s*=\s*)['"][^'"]*mockData[^'"]*['"]/;

describe('app integrity: mock/sample data must never be imported', () => {
  it('the mock data module still exists (guard against a silently renamed file)', () => {
    expect(existsSync(MOCK_DATA_PATH)).toBe(true);
  });

  it('no application source file imports mockData (SMK-05, project promise)', () => {
    const offenders = [];
    for (const file of [...walk(SRC_ROOT), ...ENTRY_FILES]) {
      if (file === MOCK_DATA_PATH) continue; // the module itself is allowed to exist
      const contents = readFileSync(file, 'utf8');
      if (MOCK_IMPORT_PATTERN.test(contents)) {
        offenders.push(file);
      }
    }
    expect(
      offenders,
      `mockData must not be imported by app code. Offending files:\n${offenders.join('\n')}`
    ).toEqual([]);
  });
});
