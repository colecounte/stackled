import { DependencyInfo } from '../types/index.js';
import https from 'https';
import http from 'http';

export interface ChangelogResult {
  packageName: string;
  version: string;
  changelog: string | null;
  source: 'github' | 'npm' | 'none';
}

export class ChangelogFetcher {
  private static readonly GITHUB_API = 'https://api.github.com';
  private static readonly NPM_REGISTRY = 'https://registry.npmjs.org';

  async fetchChangelog(dependency: DependencyInfo): Promise<ChangelogResult> {
    const result: ChangelogResult = {
      packageName: dependency.name,
      version: dependency.version,
      changelog: null,
      source: 'none'
    };

    // Try GitHub first if repository info is available
    if (dependency.repository) {
      const githubChangelog = await this.fetchFromGitHub(dependency.repository, dependency.version);
      if (githubChangelog) {
        result.changelog = githubChangelog;
        result.source = 'github';
        return result;
      }
    }

    // Fallback to NPM registry
    const npmChangelog = await this.fetchFromNpm(dependency.name, dependency.version);
    if (npmChangelog) {
      result.changelog = npmChangelog;
      result.source = 'npm';
    }

    return result;
  }

  private async fetchFromGitHub(repoUrl: string, version: string): Promise<string | null> {
    try {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) return null;

      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, '');
      const url = `${ChangelogFetcher.GITHUB_API}/repos/${owner}/${cleanRepo}/releases/tags/v${version}`;

      const response = await this.httpGet(url, { 'User-Agent': 'stackled-cli' });
      const data = JSON.parse(response);
      return data.body || null;
    } catch (error) {
      return null;
    }
  }

  private async fetchFromNpm(packageName: string, version: string): Promise<string | null> {
    try {
      const url = `${ChangelogFetcher.NPM_REGISTRY}/${packageName}/${version}`;
      const response = await this.httpGet(url);
      const data = JSON.parse(response);
      return data.description || null;
    } catch (error) {
      return null;
    }
  }

  private httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
  }
}
