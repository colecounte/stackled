import { Command } from 'commander';
import { printAuthorTable, printAuthorSummary, registerAuthorCommand } from './author-command';
import { AuthorEntry } from '../core/dependency-author-checker';

const makeEntry = (overrides: Partial<AuthorEntry> = {}): AuthorEntry => ({
  name: 'test-pkg',
  version: '1.0.0',
  authorName: 'Alice',
  maintainerCount: 1,
  hasRepository: true,
  isOrgBacked: true,
  risk: 'medium',
  flags: ['single-maintainer'],
  ...overrides,
});

const buildProgram = () => {
  const program = new Command();
  program.exitOverride();
  registerAuthorCommand(program);
  return program;
};

describe('printAuthorTable', () => {
  it('renders without throwing', () => {
    const entries = [
      makeEntry({ risk: 'low', flags: [] }),
      makeEntry({ name: 'risky-pkg', risk: 'high', flags: ['no-author', 'no-repository'] }),
    ];
    expect(() => printAuthorTable(entries)).not.toThrow();
  });

  it('handles null authorName gracefully', () => {
    expect(() => printAuthorTable([makeEntry({ authorName: null })])).not.toThrow();
  });
});

describe('printAuthorSummary', () => {
  it('prints summary without throwing', () => {
    const entries = [
      makeEntry({ risk: 'low' }),
      makeEntry({ risk: 'medium' }),
      makeEntry({ risk: 'high' }),
    ];
    expect(() => printAuthorSummary(entries)).not.toThrow();
  });

  it('handles empty list', () => {
    expect(() => printAuthorSummary([])).not.toThrow();
  });
});

describe('registerAuthorCommand', () => {
  it('registers the author command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'author');
    expect(cmd).toBeDefined();
  });

  it('has --json and --risk options', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'author')!;
    const optNames = cmd.options.map((o) => o.long);
    expect(optNames).toContain('--json');
    expect(optNames).toContain('--risk');
  });
});
