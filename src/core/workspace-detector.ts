import * as fs from 'fs';
import * as path from 'path';
import { ParsedPackage } from '../types';

export interface WorkspaceInfo {
  isMonorepo: boolean;
  type: 'npm' | 'yarn' | 'pnpm' | 'none';
  root: string;
  packages: WorkspacePackage[];
}

export interface WorkspacePackage {
  name: string;
  version: string;
  location: string;
  dependencies: Record<string, string>;
}

export function detectWorkspaceType(rootDir: string): 'npm' | 'yarn' | 'pnpm' | 'none' {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'none';

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  if (pkg.workspaces) {
    if (fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) return 'pnpm';
    if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) return 'yarn';
    return 'npm';
  }
  if (fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) return 'pnpm';
  return 'none';
}

export function resolveWorkspaceGlobs(rootDir: string, globs: string[]): string[] {
  const results: string[] = [];
  for (const pattern of globs) {
    const base = pattern.replace(/\/\*$/, '');
    const absBase = path.join(rootDir, base);
    if (!fs.existsSync(absBase)) continue;
    const entries = fs.readdirSync(absBase, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push(path.join(absBase, entry.name));
      }
    }
  }
  return results;
}

export function buildWorkspacePackage(location: string): WorkspacePackage | null {
  const pkgPath = path.join(location, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return {
    name: pkg.name ?? path.basename(location),
    version: pkg.version ?? '0.0.0',
    location,
    dependencies: {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    },
  };
}

export function detectWorkspaces(rootDir: string): WorkspaceInfo {
  const type = detectWorkspaceType(rootDir);
  if (type === 'none') {
    return { isMonorepo: false, type: 'none', root: rootDir, packages: [] };
  }

  const pkgPath = path.join(rootDir, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const globs: string[] = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces
    : rootPkg.workspaces?.packages ?? [];

  const locations = resolveWorkspaceGlobs(rootDir, globs);
  const packages: WorkspacePackage[] = [];
  for (const loc of locations) {
    const wp = buildWorkspacePackage(loc);
    if (wp) packages.push(wp);
  }

  return { isMonorepo: packages.length > 0, type, root: rootDir, packages };
}
