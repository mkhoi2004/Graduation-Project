export interface TaxInput {
  preTaxAmount: number;
  taxRate?: number;
  taxAmount?: number;
}

export interface TaxResult {
  preTaxAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export function calculateTax(input: TaxInput): TaxResult {
  if (!Number.isInteger(input.preTaxAmount) || input.preTaxAmount < 0) {
    throw new Error('Số tiền chưa thuế không hợp lệ.');
  }

  let taxRate: number;
  let taxAmount: number;

  if (input.taxAmount !== undefined) {
    if (!Number.isInteger(input.taxAmount) || input.taxAmount < 0) {
      throw new Error('Tiền thuế không hợp lệ.');
    }
    taxAmount = input.taxAmount;
    taxRate = input.preTaxAmount === 0 ? 0 : Number(((taxAmount / input.preTaxAmount) * 100).toFixed(4));
  } else {
    taxRate = input.taxRate ?? 0;
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new Error('Thuế suất phải từ 0 đến 100.');
    }
    taxAmount = Math.round(input.preTaxAmount * taxRate / 100);
  }

  if (taxRate < 0 || taxRate > 100) {
    throw new Error('Thuế suất phải từ 0 đến 100.');
  }

  return {
    preTaxAmount: input.preTaxAmount,
    taxRate,
    taxAmount,
    totalAmount: input.preTaxAmount + taxAmount,
  };
}

export interface SettlementInput {
  recognizedRevenue: number;
  taxAmount: number;
  advances: number;
  cancelled?: boolean;
}

export function calculateSettlement(input: SettlementInput) {
  for (const [label, value] of Object.entries({
    'Doanh thu': input.recognizedRevenue,
    'Tiền thuế': input.taxAmount,
    'Tiền thu trước': input.advances,
  })) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${label} không hợp lệ.`);
  }

  const grossDue = input.cancelled ? 0 : input.recognizedRevenue + input.taxAmount;
  const appliedAdvance = Math.min(grossDue, input.advances);
  return {
    grossDue,
    appliedAdvance,
    receivable: Math.max(0, grossDue - input.advances),
    surplusAdvance: Math.max(0, input.advances - grossDue),
  };
}

export type DebtAgeBucket = '0-30' | '31-60' | '61-90' | '>90';

export function ageDebt({ dueDate, asOf }: { dueDate: Date; asOf: Date }): DebtAgeBucket {
  const millisecondsPerDay = 86_400_000;
  const days = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / millisecondsPerDay));
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '>90';
}

export interface CashSummaryEntry {
  direction: 'IN' | 'OUT';
  amount: number;
  affectsCash: boolean;
  sourceCode: string;
  status: string;
}

export function summarizeCash(entries: CashSummaryEntry[]) {
  const active = entries.filter((entry) => entry.affectsCash && entry.status !== 'CANCELLED');
  const moneyIn = active.filter((entry) => entry.direction === 'IN').reduce((sum, entry) => sum + entry.amount, 0);
  const moneyOut = active.filter((entry) => entry.direction === 'OUT').reduce((sum, entry) => sum + entry.amount, 0);
  return {
    moneyIn,
    moneyOut,
    netCash: moneyIn - moneyOut,
    documentCount: new Set(active.map((entry) => entry.sourceCode)).size,
  };
}

export function isPeriodLocked(
  effectiveDate: Date,
  locks: Array<{ year: number; month: number }>,
): boolean {
  const year = effectiveDate.getUTCFullYear();
  const month = effectiveDate.getUTCMonth() + 1;
  return locks.some((lock) => lock.year === year && lock.month === month);
}
