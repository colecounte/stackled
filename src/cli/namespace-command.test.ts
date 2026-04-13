import { Command } from 'commander';
import {
  printNamespaceTable,
  printNamespaceSummary,
  registerNamespaceCommand,
} from './namespace-command';
import { NamespaceEntry } from '../core/dependency-namespace-checker';

function makeEntry(overrides: Partial<NamespaceEntry> = {}): NamespaceEntry {
  return {
    name: 'react',
    scope: null,
    isScoped: false,
    namespace: 'react',
    peerCount: 1,
    risk: 'low',
    flags: [],
    ...overrides,
  };
}

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerNamespaceCommand(program);
  return program;
}

describe('printNamespaceTable', () => {
  it('prints without throwing', () => {
    const entries = [
      makeEntry({ name: '@babel/core', scope: '@babel', isScoped: true, namespace: '@babel' }),
      makeEntry({ name: 'lodash', risk: 'medium', flags: ['generic-name'] }),
    ];
    expect(() => printNamespaceTable(entries)).not.toThrow();
  });

  it('handles empty list', () => {
    expect(() => printNamespaceTable([])).not.toThrow();
  });
});

describe('printNamespaceSummary', () => {
  it('prints summary without throwing', () => {
    const entries = [
      makeEntry({ isScoped: true, scope: '@scope', namespace: '@scope' }),
      makeEntry({ name: 'pkg-b', namespace: 'pkg', risk: 'high' }),
    ];
    expect(() => printNamespaceSummary(entries)).not.toThrow();
  });

  it('handles zero high-risk entries', () => {
    const entries = [makeEntry()];
    expect(() => printNamespaceSummary(entries)).not.toThrow();
  });
});

describe('registerNamespaceCommand', () => {
  it('registers the namespace command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'namespace');
    expect(cmd).toBeDefined();
  });

  it('command has expected options', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'namespace')!;
    const optionNames = cmd.options.map((o) => o.long);
    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--high-risk-only');
  });
});
