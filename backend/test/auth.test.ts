import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth.js';

const legacyHash = 'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$SJ2XZY2MT/Am0ejd7aiupDkBz9bjrVdnWQiNCKi0tCw=';

describe('authentication migration', () => {
  it('logs in an existing SQL user without resetting the hash', async () => {
    const database = {
      request: () => ({
        input: function () { return this; },
        query: async (query: string) => query.includes('FROM dbo.Users')
          ? { recordset: [{ Id: 7, Username: 'admin', PasswordHash: legacyHash }] }
          : { recordset: [{ Code: 'ADMIN' }] },
      }),
    };
    const auth = new AuthService(database as never, 'this-is-a-local-test-secret-with-32-bytes');
    const result = await auth.login('admin', 'Admin1234@');
    expect(result.username).toBe('admin');
    expect(result.roles).toEqual(['ADMIN']);
    expect(auth.verify(result.token)).toMatchObject({ id: 7, username: 'admin', roles: ['ADMIN'] });
    await expect(auth.login('admin', 'wrong')).rejects.toThrow();
  });
});
