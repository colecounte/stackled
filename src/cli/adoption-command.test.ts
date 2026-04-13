import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { printAdoptionTable, registerAdoptionCommand } from './adoption-command.js';
import type { AdoptionEntry } from '../core/dependency-adoption-tracker.js';

function makeEntry(overrides: Partial<AdoptionEntry> = {}): AdoptionEntry {
  return {
    name: 'react',
    currentVersion: '18.0.0',
    latestVersion: '18.2.0',
    adoptionLag: 45,
    adoptionRate: 'moderate',
    versionsBehind: 1,
    releaseDate: '2023-01-01',
    latestReleaseDate: '2023-02-15',
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerAdoptionCommand(program);
  return program;
}

describe('printAdoptionTable', () => {
  it('prints without throwing for valid entries', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const entries: AdoptionEntry[] = [
      makeEntry(),
      makeEntry({ name: 'lodash', adoptionRate: 'stale', adoptionLag: 200 }),
    ];
    expect(() => printAdoptionTable(entries)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('handles empty entries', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => printAdoptionTable([])).not.toThrow();
    spy.mockRestore();
  });
});

describe('registerAdoptionCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('registers the adoption command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'adoption');
    expect(cmd).toBeDefined();
  });

  it('has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'adoption')!;
    const optNames = cmd.options.map(o => o.long);
    expect(optNames).toContain('--path');
    expect(optNames).toContain('--stale-only');
    expect(optNames).toContain('--json');
  });
});
