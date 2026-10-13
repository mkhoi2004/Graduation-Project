import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
const iterations = 210_000;
const special = /[^\p{L}\p{N}\s]/u;
export function validPassword(password) {
    return typeof password === 'string' && password.length > 8 && special.test(password);
}
export function createHash(password) {
    if (!validPassword(password))
        throw new Error('Mật khẩu phải có hơn 8 ký tự và ký tự đặc biệt.');
    const salt = randomBytes(16);
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
    return `pbkdf2-sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export function verifyHash(password, encoded) {
    try {
        const parts = encoded.split('$');
        if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256')
            return false;
        const count = Number(parts[1]);
        if (!Number.isInteger(count) || count < 100_000 || count > 2_000_000)
            return false;
        const salt = Buffer.from(parts[2], 'base64');
        const expected = Buffer.from(parts[3], 'base64');
        if (salt.length !== 16 || expected.length !== 32)
            return false;
        const actual = pbkdf2Sync(password, salt, count, 32, 'sha256');
        return timingSafeEqual(actual, expected);
    }
    catch {
        return false;
    }
}
