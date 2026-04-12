import { Command } from 'commander';
import { registerChangelogLinkCommand } from './changelog-link-command';
import * as parser from '../core/package-parser';
import * as linker from '../core/dependency-changelog-linker';
import * as registry from '../core/registry-client';

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride();
  registerChangelogLinkCommand(program);
  return program;
}

const mockResult = {
  links: [
    {
      name: 'express',
      version: '4.18.0',
      changelogUrl: 'https://github.com/expressjs/express/blob/main/CHANGELOG.md',
      repositoryUrl: 'https://github.com/expressjs/express',
      npmUrl: 'https://www.npmjs.com/package/express/v/4.18.0',
      hasChangelog: true,
    },
  ],
  withChangelog: 1,
  withoutChangelog: 0,
  coveragePercent: 100,
};

describe('registerChangelogLinkCommand', () => {
  let parseSpy: jest.SpyInstance;
  let linkSpy: jest.SpyInstance;
  let clientSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    parseSpy = jest.spyOn(parser, 'parsePackageJson').mockReturnValue({
      dependencies: [{ name: 'express', version: '4.18.0', type: 'dependency', specifier: '^4.18.0' }],
    } as any);
    linkSpy = jest.spyOn(linker, 'linkDependencyChangelogs').mockReturnValue(mockResult);
    clientSpy = jest.spyOn(registry, 'createRegistryClient').mockReturnValue({
      getPackageInfo: jest.fn().mockResolvedValue({ repositoryUrl: 'https://github.com/expressjs/express' }),
    } as any);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('registers changelog-links command', () => {
    const program = buildProgram();
    const cmd = program.commands.find((c) => c.name() === 'changelog-links');
    expect(cmd).toBeDefined();
  });

  it('calls parsePackageJson with provided path', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'changelog-links', '-p', 'custom/package.json']);
    expect(parseSpy).toHaveBeenCalledWith('custom/package.json');
  });

  it('calls linkDependencyChangelogs and prints table', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'changelog-links']);
    expect(linkSpy).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('prints coverage summary by default', async () => {
    const program = buildProgram();
    await program.parseAsync(['node', 'stackled', 'changelog-links']);
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('Coverage');
  });
});
