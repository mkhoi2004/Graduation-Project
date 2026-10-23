import { createHmac, timingSafeEqual } from 'node:crypto';

export function formatVnpayDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

export function sortObject(obj: Record<string, unknown>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const validKeys = Object.keys(obj).filter((key) => {
    const val = obj[key];
    return val !== undefined && val !== null && val !== '';
  });

  validKeys.sort();

  for (const key of validKeys) {
    const encodedKey = encodeURIComponent(key);
    const rawVal = String(obj[key]);
    sorted[encodedKey] = encodeURIComponent(rawVal).replace(/%20/g, '+');
  }
  return sorted;
}

export function createVnpaySignData(params: Record<string, unknown>): string {
  const sorted = sortObject(params);
  return Object.keys(sorted)
    .map((key) => `${key}=${sorted[key]}`)
    .join('&');
}

export function createVnpaySignature(params: Record<string, unknown>, secretKey: string): string {
  const signData = createVnpaySignData(params);
  return createHmac('sha512', secretKey).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

export function buildVnpayPaymentUrl(
  vnpUrl: string,
  params: Record<string, unknown>,
  secretKey: string,
): string {
  const signData = createVnpaySignData(params);
  const secureHash = createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
  return `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;
}

export function verifyVnpaySignature(
  params: Record<string, unknown>,
  secretKey: string,
): boolean {
  const secureHash =
    typeof params['vnp_SecureHash'] === 'string'
      ? params['vnp_SecureHash'].toLowerCase()
      : '';
  if (!secureHash) return false;

  const filteredParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      filteredParams[key] = value;
    }
  }

  const signData = createVnpaySignData(filteredParams);
  const expectedHash = createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex')
    .toLowerCase();

  const expected = Buffer.from(expectedHash, 'utf8');
  const received = Buffer.from(secureHash, 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
