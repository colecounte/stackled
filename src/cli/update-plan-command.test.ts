import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerUpdatePlanCommand, printUpdatePlanTable } from './update-plan-command.js';
import { UpdatePlan } from '../core/dependency-update-planner.js';

vi.mock('../core/config-manager.js', () => ({ loadConfig: vi.fn().mockResolvedValue({}) }));
vi.mock('../core/package-parser.js', () => ({
  parsePackageJson: vi.fn().mockResolvedValue([
    { name: 'lodash', version: '4.17.20', type: 'dependency', raw: 'lodash@4.17.20' },
  ]),
}));
vi.mock('../core/registry-client.js', () => ({
  createRegistryClient: vi.fn().mockReturnValue({
    getPackageInfo: vi.fn().mockResolvedValue({ 'dist-tags': { latest: '4.17.21' } }),
  }),
}));

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerUpdatePlanCommand(program);
  return program;
}

function makePlan(overrides: Partial<UpdatePlan> = {}): UpdatePlan {
  return {
    name: 'pkg',
    currentVersion: '1.0.0',
    targetVersion: '1.0.1',
    updateType: 'patch',
    strategy: 'minor-safe',
    isSafe: true,
    reason: 'patch update',
    ...overrides,
  };
}

describe('printUpdatePlanTable', () => {
  it('prints no-updates message when empty', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printUpdatePlanTable([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('No updates'));
    spy.mockRestore();
  });

  it('prints a row per plan', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printUpdatePlanTable([makePlan(), makePlan({ name: 'react', updateType: 'major', isSafe: false })]);
    const calls = spy.mock.calls.map(c => c[0] as string);
    expect(calls.some(c => c.includes('pkg'))).toBe(true);
    expect(calls.some(c => c.includes('react'))).toBe(true);
    spy.mockRestore();
  });
});

describe('registerUpdatePlanCommand', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('registers update-plan command', () => {
    const program = buildProgram();
    const cmd = program.commands.find(c => c.name() === 'update-plan');
    expect(cmd).toBeDefined();
  });

  it('outputs JSON when --json flag is passed', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'update-plan', '--json']);
    const jsonCall = spy.mock.calls.find(c => {
      try { JSON.parse(c[0] as string); return true; } catch { return false; }
    });
    expect(jsonCall).toBeDefined();
    spy.mockRestore();
  });

  it('accepts --strategy option', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      buildProgram().parseAsync(['node', 'stackled', 'update-plan', '--strategy', 'patch-only'])
    ).resolves.not.toThrow();
    spy.mockRestore();
  });
});
