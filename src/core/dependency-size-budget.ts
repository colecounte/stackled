import { Dependency } from '../types';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface BudgetEntry {
  name: string;
  currentVersion: string;
  sizeBytes: number;
  budgetBytes: number;
  overageBytes: number;
  status: BudgetStatus;
  percentUsed: number;
}

export interface BudgetSummary {
  total: number;
  ok: number;
  warning: number;
  exceeded: number;
  totalSizeBytes: number;
  totalBudgetBytes: number;
}

export interface SizeBudgetConfig {
  defaultBudgetBytes: number;
  overrides: Record<string, number>;
  warningThreshold: number; // fraction, e.g. 0.8
}

export const DEFAULT_BUDGET_CONFIG: SizeBudgetConfig = {
  defaultBudgetBytes: 50 * 1024, // 50 KB
  overrides: {},
  warningThreshold: 0.8,
};

export function classifyBudgetStatus(
  sizeBytes: number,
  budgetBytes: number,
  warningThreshold: number,
): BudgetStatus {
  if (sizeBytes > budgetBytes) return 'exceeded';
  if (sizeBytes >= budgetBytes * warningThreshold) return 'warning';
  return 'ok';
}

export function buildBudgetEntry(
  dep: Dependency,
  sizeBytes: number,
  config: SizeBudgetConfig,
): BudgetEntry {
  const budgetBytes = config.overrides[dep.name] ?? config.defaultBudgetBytes;
  const status = classifyBudgetStatus(sizeBytes, budgetBytes, config.warningThreshold);
  const overageBytes = Math.max(0, sizeBytes - budgetBytes);
  const percentUsed = budgetBytes > 0 ? (sizeBytes / budgetBytes) * 100 : 0;
  return {
    name: dep.name,
    currentVersion: dep.currentVersion,
    sizeBytes,
    budgetBytes,
    overageBytes,
    status,
    percentUsed: Math.round(percentUsed * 10) / 10,
  };
}

export function checkSizeBudgets(
  deps: Dependency[],
  sizeMap: Record<string, number>,
  config: Partial<SizeBudgetConfig> = {},
): BudgetEntry[] {
  const cfg: SizeBudgetConfig = { ...DEFAULT_BUDGET_CONFIG, ...config };
  return deps.map((dep) => buildBudgetEntry(dep, sizeMap[dep.name] ?? 0, cfg));
}

export function summarizeBudgets(entries: BudgetEntry[]): BudgetSummary {
  return {
    total: entries.length,
    ok: entries.filter((e) => e.status === 'ok').length,
    warning: entries.filter((e) => e.status === 'warning').length,
    exceeded: entries.filter((e) => e.status === 'exceeded').length,
    totalSizeBytes: entries.reduce((sum, e) => sum + e.sizeBytes, 0),
    totalBudgetBytes: entries.reduce((sum, e) => sum + e.budgetBytes, 0),
  };
}
