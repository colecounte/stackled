import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectWorkspaceType,
  resolveWorkspaceGlobs,
  buildWorkspacePackage,
  detectWorkspaces,
} from './workspace-detector';

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stackled-ws-'));
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

describe('detectWorkspaceType', () => {
  it('returns none when no package.json exists', () => {
    const dir = makeTempDir();
    expect(detectWorkspaceType(dir)).toBe('none');
  });

  it('returns none when package.json has no workspaces', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'app' });
    expect(detectWorkspaceType(dir)).toBe('none');
  });

  it('returns yarn when yarn.lock exists alongside workspaces', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'root', workspaces: ['packages/*'] });
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
    expect(detectWorkspaceType(dir)).toBe('yarn');
  });

  it('returns npm when no lock file matches yarn or pnpm', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'root', workspaces: ['packages/*'] });
    expect(detectWorkspaceType(dir)).toBe('npm');
  });
});

describe('resolveWorkspaceGlobs', () => {
  it('returns directories matching glob pattern', () => {
    const dir = makeTempDir();
    fs.mkdirSync(path.join(dir, 'packages', 'alpha'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'packages', 'beta'), { recursive: true });
    const results = resolveWorkspaceGlobs(dir, ['packages/*']);
    expect(results).toHaveLength(2);
  });

  it('skips non-existent base directories', () => {
    const dir = makeTempDir();
    const results = resolveWorkspaceGlobs(dir, ['missing/*']);
    expect(results).toHaveLength(0);
  });
});

describe('buildWorkspacePackage', () => {
  it('returns null when no package.json in location', () => {
    const dir = makeTempDir();
    expect(buildWorkspacePackage(dir)).toBeNull();
  });

  it('builds a workspace package entry from package.json', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: '@scope/pkg',
      version: '1.2.3',
      dependencies: { react: '^18.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    const result = buildWorkspacePackage(dir);
    expect(result?.name).toBe('@scope/pkg');
    expect(result?.version).toBe('1.2.3');
    expect(result?.dependencies).toHaveProperty('react');
    expect(result?.dependencies).toHaveProperty('typescript');
  });
});

describe('detectWorkspaces', () => {
  it('returns non-monorepo info when workspace type is none', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'simple-app' });
    const info = detectWorkspaces(dir);
    expect(info.isMonorepo).toBe(false);
    expect(info.packages).toHaveLength(0);
  });

  it('detects packages in a monorepo', () => {
    const dir = makeTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'root', workspaces: ['packages/*'] });
    writeJson(path.join(dir, 'packages', 'core', 'package.json'), { name: '@mono/core', version: '0.1.0' });
    writeJson(path.join(dir, 'packages', 'utils', 'package.json'), { name: '@mono/utils', version: '0.2.0' });
    const info = detectWorkspaces(dir);
    expect(info.isMonorepo).toBe(true);
    expect(info.packages).toHaveLength(2);
    expect(info.packages.map(p => p.name)).toContain('@mono/core');
  });
});
