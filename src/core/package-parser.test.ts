import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PackageParser, PackageJson } from './package-parser';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('PackageParser', () => {
  let parser: PackageParser;

  beforeEach(() => {
    parser = new PackageParser();
    vi.clearAllMocks();
  });

  describe('readPackageJson', () => {
    it('should read and parse valid package.json', async () => {
      const mockPackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: { 'express': '^4.18.0' }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const result = await parser.readPackageJson('/test/path');

      expect(result).toEqual(mockPackageJson);
      expect(fs.readFile).toHaveBeenCalledWith('/test/path/package.json', 'utf-8');
    });

    it('should throw error when package.json not found', async () => {
      const error: NodeJS.ErrnoException = new Error('File not found');
      error.code = 'ENOENT';
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(parser.readPackageJson('/test/path')).rejects.toThrow(
        'package.json not found at /test/path/package.json'
      );
    });

    it('should throw error for invalid package.json', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('{ "name": "test" }');

      await expect(parser.readPackageJson('/test/path')).rejects.toThrow(
        'Invalid package.json: missing name or version'
      );
    });
  });

  describe('extractDependencies', () => {
    it('should extract both dependencies and devDependencies', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: { 'express': '^4.18.0', 'lodash': '^4.17.21' },
        devDependencies: { 'typescript': '^5.0.0' }
      };

      const result = parser.extractDependencies(packageJson);

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ name: 'express', version: '^4.18.0', isDev: false });
      expect(result).toContainEqual({ name: 'lodash', version: '^4.17.21', isDev: false });
      expect(result).toContainEqual({ name: 'typescript', version: '^5.0.0', isDev: true });
    });

    it('should handle package.json with no dependencies', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0'
      };

      const result = parser.extractDependencies(packageJson);

      expect(result).toEqual([]);
    });
  });

  describe('parseDependencies', () => {
    it('should read and extract dependencies in one call', async () => {
      const mockPackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: { 'react': '^18.2.0' }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockPackageJson));

      const result = await parser.parseDependencies('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: 'react', version: '^18.2.0', isDev: false });
    });
  });
});
