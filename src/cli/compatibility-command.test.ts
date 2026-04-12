import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { printCompatibilityTable, registerCompatibilityCommand } from './compatibility-command.js';
import { CompatibilityEntry } from '../core/compatibility-matrix.js';

function makeEntry(overrides: Partial<CompatibilityEntry> = {}): CompatibilityEntry {
  return {
    name: 'test-pkg',
    currentVersion: '1.0.0',
    targetVersion: '1.0.1',
    nodeRange: null,
    compatible: true,
    breakingChange: false,
    risk: 'low',
    notes: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerCompatibilityCommand(program);
  return program;
}

vi.mock('../core/package-parser.js', () => ({
  parsePackageJson: vi.fn(() => ({
    dependencies: [{ name: 'react', currentVersion: '17.0.0', versionRange: '^17.0.0', type: 'production' }],
  })),
}));

vi.mock('../core/registry-client.js', () => ({
  createRegistryClient: vi.fn(() => ({
    getPackageInfo: vi.fn(async () => ({ 'dist-tags': { latest: '18.0.0' }, engines: { node: '>=14.0.0' } })),
  })),
}));

describe('printCompatibilityTable', () => {
  it('prints entries without throwing', () => {
    const entries = [makeEntry(), makeEntry({ name: 'vue', risk: 'high', breakingChange: true })];
    expect(() => printCompatibilityTable(entries)).not.toThrow();
  });

  it('handles empty entries', () => {
    expect(() => printCompatibilityTable([])).not.toThrow();
  });

  it('shows notes when present', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printCompatibilityTable([makeEntry({ notes: ['Major version bump'] })]);
    const output = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Major version bump');
    spy.mockRestore();
  });
});

describe('registerCompatibilityCommand', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registers compat command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'compat');
    expect(cmd).toBeDefined();
  });

  it('executes without error', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'compat'], { from: 'user' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('supports --only-breaking flag', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'compat', '--only-breaking'], { from: 'user' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
