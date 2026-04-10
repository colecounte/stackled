import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerGraphCommand } from './graph-command';

vi.mock('../core/config-manager', () => ({
  loadConfig: vi.fn().mockResolvedValue({ registry: 'https://registry.npmjs.org' }),
}));

vi.mock('../core/package-parser', () => ({
  parsePackageJson: vi.fn().mockResolvedValue({
    dependencies: { react: '^18.0.0', lodash: '^4.17.0' },
    devDependencies: {},
  }),
}));

vi.mock('../core/dependency-analyzer', () => ({
  analyzeDependencies: vi.fn().mockResolvedValue([
    { name: 'react', currentVersion: '18.0.0', latestVersion: '18.2.0', type: 'dependencies' },
    { name: 'lodash', currentVersion: '4.17.21', latestVersion: '4.17.21', type: 'dependencies' },
  ]),
}));

vi.mock('../core/dependency-graph', () => ({
  buildDependencyGraph: vi.fn().mockReturnValue({
    nodes: new Map([
      ['react', { name: 'react', version: '18.0.0', dependencies: [], dependents: [], depth: 0 }],
      ['lodash', { name: 'lodash', version: '4.17.21', dependencies: [], dependents: [], depth: 0 }],
    ]),
    roots: ['react', 'lodash'],
  }),
  getGraphStats: vi.fn().mockReturnValue({ totalNodes: 2, maxDepth: 0, rootCount: 2 }),
  getTransitiveDependents: vi.fn().mockReturnValue(['my-app']),
}));

describe('registerGraphCommand', () => {
  let program: Command;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerGraphCommand(program);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('registers the graph command', () => {
    const cmd = program.commands.find((c) => c.name() === 'graph');
    expect(cmd).toBeDefined();
  });

  it('graph command has correct description', () => {
    const cmd = program.commands.find((c) => c.name() === 'graph');
    expect(cmd?.description()).toContain('dependency graph');
  });

  it('graph command accepts --focus option', () => {
    const cmd = program.commands.find((c) => c.name() === 'graph');
    const focusOpt = cmd?.options.find((o) => o.long === '--focus');
    expect(focusOpt).toBeDefined();
  });

  it('graph command accepts --package option', () => {
    const cmd = program.commands.find((c) => c.name() === 'graph');
    const pkgOpt = cmd?.options.find((o) => o.long === '--package');
    expect(pkgOpt).toBeDefined();
  });

  it('runs graph command without errors', async () => {
    await program.parseAsync(['node', 'stackled', 'graph'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('runs graph command with --focus flag', async () => {
    await program.parseAsync(['node', 'stackled', 'graph', '--focus', 'react'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalled();
  });
});
