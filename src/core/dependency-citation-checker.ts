import { PackageInfo } from '../types';

export interface CitationEntry {
  name: string;
  version: string;
  hasCitationFile: boolean;
  hasDoi: boolean;
  hasAcademicLicense: boolean;
  citationUrl: string | null;
  risk: 'none' | 'low' | 'medium' | 'high';
  flags: string[];
}

export interface CitationSummary {
  total: number;
  withCitation: number;
  withDoi: number;
  uncited: number;
}

export function classifyCitationRisk(
  hasCitationFile: boolean,
  hasDoi: boolean,
  hasAcademicLicense: boolean
): CitationEntry['risk'] {
  if (hasAcademicLicense && !hasCitationFile) return 'high';
  if (!hasCitationFile && !hasDoi) return 'medium';
  if (hasCitationFile || hasDoi) return 'none';
  return 'low';
}

export function buildCitationFlags(
  hasCitationFile: boolean,
  hasDoi: boolean,
  hasAcademicLicense: boolean
): string[] {
  const flags: string[] = [];
  if (!hasCitationFile) flags.push('no CITATION.cff');
  if (!hasDoi) flags.push('no DOI');
  if (hasAcademicLicense) flags.push('academic license');
  return flags;
}

export function buildCitationEntry(pkg: PackageInfo): CitationEntry {
  const keywords: string[] = (pkg as any).keywords ?? [];
  const repositoryUrl: string = (pkg as any).repositoryUrl ?? '';
  const hasCitationFile = keywords.includes('citation') || keywords.includes('cff');
  const hasDoi = /doi\.org/.test(repositoryUrl) || keywords.includes('doi');
  const hasAcademicLicense = /academic|research/i.test((pkg as any).license ?? '');
  const citationUrl = hasDoi ? repositoryUrl : null;

  return {
    name: pkg.name,
    version: pkg.version,
    hasCitationFile,
    hasDoi,
    hasAcademicLicense,
    citationUrl,
    risk: classifyCitationRisk(hasCitationFile, hasDoi, hasAcademicLicense),
    flags: buildCitationFlags(hasCitationFile, hasDoi, hasAcademicLicense),
  };
}

export function checkDependencyCitations(packages: PackageInfo[]): CitationEntry[] {
  return packages.map(buildCitationEntry);
}

export function summarizeCitations(entries: CitationEntry[]): CitationSummary {
  return {
    total: entries.length,
    withCitation: entries.filter(e => e.hasCitationFile).length,
    withDoi: entries.filter(e => e.hasDoi).length,
    uncited: entries.filter(e => !e.hasCitationFile && !e.hasDoi).length,
  };
}
