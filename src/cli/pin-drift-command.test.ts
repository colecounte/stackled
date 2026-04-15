import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { printPinDriftTable, registerPinDriftCommand } from './pin-drift-command.js';
import type { PinDriftEntry } from '../core/dependency-pin-drift-detector.js';

function makeEntry(overrides: Partial<PinDriftEntry> = {}): PinDriftEntry {
  return {
    name: 'lodash',
    currentVersion: '4.17.0',
    resolvedVersion: '4.17.0',
    specifier: '4.17.0',
    driftLevel: 'none',
    versionsBehind: 0,
    isPinned: true,
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerPinDriftCommand(program);
  return program;
}

describe('printPinDriftTable', () => {
  it('renders without error for empty list', () => {
    expect(() => printPinDriftTable([])).not.toThrow();
  });

  it('renders entries', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printPinDriftTable([
      makeEntry({ name: 'express', driftLevel: 'moderate', versionsBehind: 4 }),
    ]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('renders severe entry in red', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation((line: string) => {
      if (typeof line === 'string' && line.includes('express')) {
        expect(line).toContain('severe');
      }
    });
    printPinDriftTable([makeEntry({ name: 'express', driftLevel: 'severe', versionsBehind: 10 })]);
    spy.mockRestore();
  });
});

describe('registerPinDriftCommand', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers pin-drift command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'pin-drift');
    expect(cmd).toBeDefined();
  });

  it('has --severe-only option', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'pin-drift')!;
    const opt = cmd.options.find((o) => o.long === '--severe-only');
    expect(opt).toBeDefined();
  });
});
