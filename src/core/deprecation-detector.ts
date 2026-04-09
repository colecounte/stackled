import { DependencyInfo, DeprecationWarning } from '../types';

const DEPRECATION_PATTERNS = [
  /deprecated/i,
  /no longer maintained/i,
  /use (\S+) instead/i,
  /moved to (\S+)/i,
  /end of life/i,
  /eol/i,
];

const SUCCESSOR_PATTERN = /(?:use|moved to|replaced by|see)\s+([@\w/-]+)/i;

export function isDeprecated(npmMetadata: Record<string, unknown>): boolean {
  if (npmMetadata.deprecated) return true;
  const description = (npmMetadata.description as string) ?? '';
  return DEPRECATION_PATTERNS.some((pattern) => pattern.test(description));
}

export function extractDeprecationMessage(
  npmMetadata: Record<string, unknown>
): string {
  if (typeof npmMetadata.deprecated === 'string') {
    return npmMetadata.deprecated;
  }
  const description = (npmMetadata.description as string) ?? '';
  const match = DEPRECATION_PATTERNS.find((p) => p.test(description));
  return match ? description : 'Package is deprecated.';
}

export function extractSuccessor(
  message: string
): string | undefined {
  const match = SUCCESSOR_PATTERN.exec(message);
  return match?.[1];
}

export function detectDeprecations(
  dependencies: DependencyInfo[]
): DeprecationWarning[] {
  return dependencies
    .filter((dep) => dep.npmMetadata && isDeprecated(dep.npmMetadata))
    .map((dep) => {
      const message = extractDeprecationMessage(dep.npmMetadata!);
      const successor = extractSuccessor(message);
      return {
        packageName: dep.name,
        currentVersion: dep.currentVersion,
        message,
        successor,
      };
    });
}
