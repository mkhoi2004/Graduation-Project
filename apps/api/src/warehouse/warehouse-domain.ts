import { createHash } from 'node:crypto';

export interface ReceiptLineInput {
  inputQuantity: number;
  conversionFactor?: number;
  convertedQuantity?: number;
  inputUnitPrice?: number;
  vatRate?: number;
}

export function calculateReceiptLine(input: ReceiptLineInput) {
  const inputQuantity = Number(input.inputQuantity);
  const conversionFactor = input.convertedQuantity && input.inputQuantity
    ? input.convertedQuantity / input.inputQuantity
    : Number(input.conversionFactor ?? 1);
  const convertedQuantity = input.convertedQuantity ?? Math.round(inputQuantity * conversionFactor * 10000) / 10000;
  const inputUnitPrice = Number(input.inputUnitPrice ?? 0);
  const vatRate = Number(input.vatRate ?? 0);

  const goodsAmount = Math.round(inputQuantity * inputUnitPrice);
  const vatAmount = Math.round((goodsAmount * vatRate) / 100);
  const totalAmount = goodsAmount + vatAmount;
  const unitCost = convertedQuantity > 0 ? Math.round((goodsAmount / convertedQuantity) * 10000) / 10000 : 0;

  return {
    conversionFactor,
    convertedQuantity,
    goodsAmount,
    vatAmount,
    totalAmount,
    unitCost,
  };
}

export interface StockBatchCandidate {
  id: number;
  quantity: number;
  receivedAt: Date;
  expiryDate: Date | null;
  batchNo?: string | null;
}

function startOfDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function allocateStock(
  batches: StockBatchCandidate[],
  requestedQuantity: number,
  now: Date,
  allowExpired: boolean,
  manualBatchId?: number,
): Array<{ batchId: number; quantity: number }> {
  if (requestedQuantity <= 0) throw new Error('Số lượng xuất phải lớn hơn 0');
  const today = startOfDay(now);

  if (manualBatchId) {
    const targetBatch = batches.find((b) => b.id === manualBatchId);
    if (!targetBatch) throw new Error(`Lô được chọn (ID: ${manualBatchId}) không tồn tại.`);
    if (targetBatch.quantity < requestedQuantity) {
      throw new Error(`Lô ${targetBatch.batchNo || targetBatch.id} chỉ còn ${targetBatch.quantity}, không đủ xuất ${requestedQuantity}.`);
    }
    if (!allowExpired && targetBatch.expiryDate && startOfDay(targetBatch.expiryDate) <= today) {
      throw new Error(`Lô ${targetBatch.batchNo || targetBatch.id} đã hết hạn sử dụng (${targetBatch.expiryDate.toISOString().slice(0, 10)}).`);
    }
    return [{ batchId: targetBatch.id, quantity: requestedQuantity }];
  }

  const available = batches
    .filter((batch) => batch.quantity > 0 && (allowExpired || !batch.expiryDate || startOfDay(batch.expiryDate) > today))
    .sort((left, right) => {
      if (left.expiryDate && right.expiryDate) return left.expiryDate.getTime() - right.expiryDate.getTime();
      if (left.expiryDate) return -1;
      if (right.expiryDate) return 1;
      return left.receivedAt.getTime() - right.receivedAt.getTime();
    });

  let remaining = requestedQuantity;
  const allocations: Array<{ batchId: number; quantity: number }> = [];
  for (const batch of available) {
    if (remaining <= 0) break;
    const quantity = Math.min(batch.quantity, remaining);
    allocations.push({ batchId: batch.id, quantity });
    remaining -= quantity;
  }
  if (remaining > 0) throw new Error('Không đủ tồn kho khả dụng');
  return allocations;
}

export function classifyBatch(
  batch: { quantity: number; minimumStock: number; expiryDate: Date | null },
  now: Date,
  warningDays: number = 90,
) {
  let expiryStatus: 'NO_EXPIRY' | 'AVAILABLE' | 'EXPIRING_SOON' | 'EXPIRED' = 'NO_EXPIRY';
  let daysRemaining: number | null = null;
  if (batch.expiryDate) {
    const days = Math.ceil((startOfDay(batch.expiryDate) - startOfDay(now)) / 86_400_000);
    daysRemaining = days;
    expiryStatus = days <= 0 ? 'EXPIRED' : days <= warningDays ? 'EXPIRING_SOON' : 'AVAILABLE';
  }
  return { isLowStock: batch.quantity <= batch.minimumStock, expiryStatus, daysRemaining };
}

export function computeDocumentHash(payload: {
  code: string;
  type: string;
  outboundType?: string | null;
  supplierId?: number | null;
  lines: Array<{
    supplyId: number;
    convertedQuantity: number | string;
    goodsAmount: number;
    totalAmount: number;
  }>;
  totalAmount: number;
}): string {
  const normalized = JSON.stringify({
    code: payload.code,
    type: payload.type,
    outboundType: payload.outboundType ?? null,
    supplierId: payload.supplierId ?? null,
    lines: payload.lines.map((l) => ({
      supplyId: l.supplyId,
      qty: Number(l.convertedQuantity),
      goods: l.goodsAmount,
      total: l.totalAmount,
    })),
    total: payload.totalAmount,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Đọc số tiền bằng chữ tiếng Việt chính xác theo chuẩn kế toán Việt Nam
 */
export function readVietnameseCurrency(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng';
  const absAmount = Math.abs(Math.round(amount));

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readGroupOfThree(num: number, showZeroHundred: boolean): string {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    if (h === 0 && t === 0 && u === 0) return '';

    let res = '';
    if (h > 0 || showZeroHundred) {
      res += `${digits[h]} trăm `;
    }

    if (t === 0 && u > 0) {
      if (h > 0 || showZeroHundred) res += 'lẻ ';
      res += digits[u];
    } else if (t === 1) {
      res += 'mười ';
      if (u === 1) res += 'một';
      else if (u === 5) res += 'lăm';
      else if (u > 0) res += digits[u];
    } else if (t > 1) {
      res += `${digits[t]} mươi `;
      if (u === 1) res += 'mốt';
      else if (u === 5) res += 'lăm';
      else if (u > 0) res += digits[u];
    }

    return res.trim();
  }

  const str = absAmount.toString();
  const groups: number[] = [];
  let idx = str.length;
  while (idx > 0) {
    const start = Math.max(0, idx - 3);
    groups.push(parseInt(str.slice(start, idx), 10));
    idx = start;
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp === 0) continue;
    const isNotFirst = i < groups.length - 1;
    const part = readGroupOfThree(grp, isNotFirst);
    words += `${part} ${units[i]} `;
  }

  words = words.trim();
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
  } else {
    words = 'Không đồng';
  }

  return (amount < 0 ? 'Âm ' : '') + words.replaceAll(/\s+/g, ' ');
}
