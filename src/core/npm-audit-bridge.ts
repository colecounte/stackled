import { execSync } from 'child_process';
import path from 'path';
import { Vulnerability } from '../types/index.js';

export interface NpmAuditAdvisory {
  id: number;
  title: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  url: string;
  range: string;
  fixAvailable: boolean;
}

export interface NpmAuditResult {
  advisories: NpmAuditAdvisory[];
  totalVulnerabilities: number;
  metadata: {
    vulnerabilities: Record<string, number>;
  };
}

export function runNpmAudit(cwd: string): NpmAuditResult {
  try {
    const output = execSync('npm audit --json', {
      cwd: path.resolve(cwd),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
    return parseNpmAuditOutput(output);
  } catch (err: unknown) {
    // npm audit exits non-zero when vulnerabilities are found
    const output = (err as { stdout?: Buffer }).stdout?.toString() ?? '{}';
    return parseNpmAuditOutput(output);
  }
}

export function parseNpmAuditOutput(raw: string): NpmAuditResult {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { advisories: [], totalVulnerabilities: 0, metadata: { vulnerabilities: {} } };
  }

  const vulnMap = (parsed['vulnerabilities'] ?? {}) as Record<string, unknown>;
  const advisories: NpmAuditAdvisory[] = [];

  for (const [, info] of Object.entries(vulnMap)) {
    const v = info as Record<string, unknown>;
    const via = (v['via'] as unknown[]) ?? [];
    for (const entry of via) {
      if (typeof entry === 'object' && entry !== null) {
        const e = entry as Record<string, unknown>;
        advisories.push({
          id: (e['source'] as number) ?? 0,
          title: (e['title'] as string) ?? 'Unknown',
          severity: (e['severity'] as NpmAuditAdvisory['severity']) ?? 'low',
          url: (e['url'] as string) ?? '',
          range: (e['range'] as string) ?? '*',
          fixAvailable: Boolean(v['fixAvailable']),
        });
      }
    }
  }

  const meta = (parsed['metadata'] as Record<string, unknown>) ?? {};
  const vulnCounts = (meta['vulnerabilities'] as Record<string, number>) ?? {};
  const total = Object.values(vulnCounts).reduce((a, b) => a + b, 0);

  return { advisories, totalVulnerabilities: total, metadata: { vulnerabilities: vulnCounts } };
}

export function mapToVulnerabilities(result: NpmAuditResult): Vulnerability[] {
  return result.advisories.map((adv) => ({
    id: String(adv.id),
    title: adv.title,
    severity: adv.severity === 'moderate' ? 'medium' : adv.severity === 'info' ? 'low' : adv.severity,
    url: adv.url,
    range: adv.range,
    fixAvailable: adv.fixAvailable,
  } as Vulnerability));
}
