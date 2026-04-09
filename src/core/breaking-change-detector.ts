import { DependencyUpdate, BreakingChange, ChangelogEntry } from '../types/index.js';
import semver from 'semver';

/**
 * Detects breaking changes in dependency updates
 */
export class BreakingChangeDetector {
  /**
   * Analyze a dependency update for breaking changes
   */
  analyzeUpdate(update: DependencyUpdate, changelog?: ChangelogEntry): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];

    // Check for major version bumps
    if (this.isMajorVersionBump(update.currentVersion, update.latestVersion)) {
      breakingChanges.push({
        packageName: update.packageName,
        fromVersion: update.currentVersion,
        toVersion: update.latestVersion,
        severity: 'high',
        description: `Major version bump from ${update.currentVersion} to ${update.latestVersion}`,
        type: 'major-version',
        affectedAPIs: this.extractAffectedAPIs(changelog)
      });
    }

    // Check changelog for breaking change indicators
    if (changelog) {
      const changelogBreaking = this.detectFromChangelog(update, changelog);
      breakingChanges.push(...changelogBreaking);
    }

    return breakingChanges;
  }

  /**
   * Check if version change is a major bump
   */
  private isMajorVersionBump(current: string, latest: string): boolean {
    try {
      const currentMajor = semver.major(current);
      const latestMajor = semver.major(latest);
      return latestMajor > currentMajor;
    } catch {
      return false;
    }
  }

  /**
   * Detect breaking changes from changelog content
   */
  private detectFromChangelog(update: DependencyUpdate, changelog: ChangelogEntry): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];
    const breakingKeywords = ['BREAKING CHANGE', 'breaking:', 'BREAKING:', '⚠️', '💥'];

    const content = changelog.content.toLowerCase();
    const hasBreakingKeyword = breakingKeywords.some(keyword => 
      content.includes(keyword.toLowerCase())
    );

    if (hasBreakingKeyword) {
      breakingChanges.push({
        packageName: update.packageName,
        fromVersion: update.currentVersion,
        toVersion: update.latestVersion,
        severity: 'high',
        description: 'Breaking changes detected in changelog',
        type: 'changelog-indicated',
        affectedAPIs: this.extractAffectedAPIs(changelog)
      });
    }

    return breakingChanges;
  }

  /**
   * Extract affected APIs from changelog
   */
  private extractAffectedAPIs(changelog?: ChangelogEntry): string[] {
    if (!changelog) return [];

    const apiPattern = /`([a-zA-Z0-9_]+)`/g;
    const matches = changelog.content.match(apiPattern);
    
    return matches ? matches.map(m => m.replace(/`/g, '')) : [];
  }
}
