import { describe, it, expect, beforeEach } from '@jest/globals';
import { DependencyAnalyzer } from './dependency-analyzer';
import { PackageJson } from './package-parser';

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze a package.json with all dependency types', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          'react': '^18.2.0',
          'express': '~4.18.0',
        },
        devDependencies: {
          'typescript': '^5.0.0',
          'jest': '^29.0.0',
        },
        peerDependencies: {
          'react-dom': '^18.0.0',
        },
      };

      const result = analyzer.analyze(packageJson);

      expect(result.totalDependencies).toBe(5);
      expect(result.productionDependencies).toBe(2);
      expect(result.devDependencies).toBe(2);
      expect(result.peerDependencies).toBe(1);
      expect(result.dependencies).toHaveLength(5);
    });

    it('should handle package.json with only production dependencies', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: {
          'lodash': '^4.17.21',
        },
      };

      const result = analyzer.analyze(packageJson);

      expect(result.totalDependencies).toBe(1);
      expect(result.productionDependencies).toBe(1);
      expect(result.devDependencies).toBe(0);
      expect(result.peerDependencies).toBe(0);
    });

    it('should handle package.json with no dependencies', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
      };

      const result = analyzer.analyze(packageJson);

      expect(result.totalDependencies).toBe(0);
      expect(result.productionDependencies).toBe(0);
      expect(result.devDependencies).toBe(0);
      expect(result.peerDependencies).toBe(0);
    });
  });

  describe('filterByType', () => {
    it('should filter dependencies by type', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: { 'react': '^18.2.0' },
        devDependencies: { 'jest': '^29.0.0' },
      };

      const result = analyzer.analyze(packageJson);
      const devDeps = analyzer.filterByType(result.dependencies, 'devDependencies');

      expect(devDeps).toHaveLength(1);
      expect(devDeps[0].name).toBe('jest');
    });
  });

  describe('findDependency', () => {
    it('should find a dependency by name', () => {
      const packageJson: PackageJson = {
        name: 'test-app',
        version: '1.0.0',
        dependencies: { 'react': '^18.2.0' },
      };

      const result = analyzer.analyze(packageJson);
      const dep = analyzer.findDependency(result.dependencies, 'react');

      expect(dep).toBeDefined();
      expect(dep?.currentVersion).toBe('^18.2.0');
    });
  });
});
