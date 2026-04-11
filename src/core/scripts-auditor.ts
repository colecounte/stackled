import { PackageJson } from '../types';

export type ScriptRisk = 'safe' | 'suspicious' | 'dangerous';

export interface ScriptEntry {
  name: string;
  command: string;
  risk: ScriptRisk;
  reason?: string;
}

export interface ScriptsAuditResult {
  package: string;
  scripts: ScriptEntry[];
  hasDangerousScripts: boolean;
  hasSuspiciousScripts: boolean;
}

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /curl\s+.*\|\s*(ba)?sh/i, reason: 'Remote code execution via curl pipe' },
  { pattern: /wget\s+.*\|\s*(ba)?sh/i, reason: 'Remote code execution via wget pipe' },
  { pattern: /eval\s*\(/i, reason: 'Use of eval()' },
  { pattern: /rm\s+-rf\s+\//i, reason: 'Recursive deletion from root' },
];

const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /postinstall|preinstall/i, reason: 'Lifecycle hook runs on install' },
  { pattern: /node\s+-e/i, reason: 'Inline Node.js execution' },
  { pattern: /process\.env/i, reason: 'Accesses environment variables' },
  { pattern: /base64/i, reason: 'Base64 encoded content' },
];

export function classifyScriptRisk(command: string): { risk: ScriptRisk; reason?: string } {
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) return { risk: 'dangerous', reason };
  }
  for (const { pattern, reason } of SUSPICIOUS_PATTERNS) {
    if (pattern.test(command)) return { risk: 'suspicious', reason };
  }
  return { risk: 'safe' };
}

export function buildScriptEntry(name: string, command: string): ScriptEntry {
  const { risk, reason } = classifyScriptRisk(command);
  return { name, command, risk, reason };
}

export function auditScripts(
  packages: Array<{ name: string; packageJson: PackageJson }>
): ScriptsAuditResult[] {
  return packages.map(({ name, packageJson }) => {
    const scripts = packageJson.scripts ?? {};
    const entries = Object.entries(scripts).map(([scriptName, command]) =>
      buildScriptEntry(scriptName, command as string)
    );
    return {
      package: name,
      scripts: entries,
      hasDangerousScripts: entries.some((e) => e.risk === 'dangerous'),
      hasSuspiciousScripts: entries.some((e) => e.risk === 'suspicious'),
    };
  });
}

export function summarizeScriptsAudit(results: ScriptsAuditResult[]): {
  dangerous: number;
  suspicious: number;
  safe: number;
} {
  let dangerous = 0;
  let suspicious = 0;
  let safe = 0;
  for (const r of results) {
    if (r.hasDangerousScripts) dangerous++;
    else if (r.hasSuspiciousScripts) suspicious++;
    else safe++;
  }
  return { dangerous, suspicious, safe };
}
