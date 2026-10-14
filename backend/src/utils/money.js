import Decimal from 'decimal.js';

// Configure decimal.js for financial accuracy
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const MAX_ROUNDING_AMOUNT = '1000.00';

export function toDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return new Decimal('0.00');
  }
  if (value instanceof Decimal) return value;
  return new Decimal(String(value));
}

export function formatMoneyDb(value) {
  return toDecimal(value).toFixed(2);
}

export function addMoney(a, b) {
  return toDecimal(a).plus(toDecimal(b)).toFixed(2);
}

export function subtractMoney(a, b) {
  return toDecimal(a).minus(toDecimal(b)).toFixed(2);
}

export function multiplyMoney(amount, factor) {
  return toDecimal(amount).times(toDecimal(factor)).toFixed(2);
}

export function divideMoney(amount, divisor) {
  const d = toDecimal(divisor);
  if (d.isZero()) throw new Error('Division by zero in money calculation');
  return toDecimal(amount).dividedBy(d).toFixed(2);
}

export function compareMoney(a, b) {
  return toDecimal(a).comparedTo(toDecimal(b));
}

export function isZero(amount) {
  return toDecimal(amount).isZero();
}

export function isPositive(amount) {
  return toDecimal(amount).isPositive() && !toDecimal(amount).isZero();
}

export function isNegative(amount) {
  return toDecimal(amount).isNegative();
}

export function formatMoneyVND(amount) {
  const d = toDecimal(amount);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(d.toNumber());
}
