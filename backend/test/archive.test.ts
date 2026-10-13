import { describe, expect, it } from 'vitest';
import { ArchiveService } from '../src/archive.js';
import { ConflictException } from '@nestjs/common';

describe('archive deletion', () => {
  it('keeps actor context, guarded delete and audit in one SQL transaction', async () => {
    const transaction = {};
    const statements: string[] = [];
    let transactionCommitted = false;
    const database = {
      transaction: async (action: (tx: object) => Promise<unknown>) => {
        const result = await action(transaction);
        transactionCommitted = true;
        return result;
      },
      request: (tx: object) => {
        expect(tx).toBe(transaction);
        return {
          input: function () { return this; },
          query: async (statement: string) => {
            statements.push(statement);
            if (statement.includes('SELECT Id')) return { recordset: [{ Id: 7 }] };
            return { recordset: [], rowsAffected: [1] };
          },
        };
      },
    };
    const archive = new ArchiveService(database as never);
    expect(await archive.delete('Patients', 7, 2, 'Sai dữ liệu')).toBe('deleted');
    expect(transactionCommitted).toBe(true);
    expect(statements.map(statement => statement.match(/sp_set_session_context|SELECT Id|DELETE FROM|INSERT dbo.AuditLogs/)?.[0]))
      .toEqual(['sp_set_session_context', 'SELECT Id', 'DELETE FROM', 'INSERT dbo.AuditLogs']);
  });
  it('does not delete a visit that has already started', async () => {
    const statements: string[] = [];
    const database = {
      transaction: async (action: (tx: object) => Promise<unknown>) => action({}),
      request: () => ({
        input: function () { return this; },
        query: async (statement: string) => {
          statements.push(statement);
          return { recordset: [{ Status: 'IN_PROGRESS' }] };
        },
      }),
    };
    expect(await new ArchiveService(database as never).delete('Visits', 8, 2, 'Hủy')).toBe('conflict');
    expect(statements.some(statement => statement.includes('DELETE FROM'))).toBe(false);
  });
  it('returns conflict when SQL reports a blocked DELETE as statement termination', async () => {
    const database = {
      transaction: async (action: (tx: object) => Promise<unknown>) => action({}),
      request: () => ({
        input: function () { return this; },
        query: async (statement: string) => {
          if (statement.includes('SELECT Id')) return { recordset: [{ Id: 7 }] };
          if (statement.includes('DELETE FROM')) throw Object.assign(new Error('terminated'), { number: 3621 });
          return { recordset: [] };
        },
      }),
    };
    await expect(new ArchiveService(database as never).delete('Patients', 7, 2, 'Đã có lượt khám'))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
