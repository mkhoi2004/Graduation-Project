import { createRequire } from 'node:module';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type * as Mssql from 'mssql';

const require = createRequire(import.meta.url);
export const sql = require('mssql/msnodesqlv8') as typeof Mssql;

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private pool?: Mssql.ConnectionPool;

  async onModuleInit(): Promise<void> {
    const server = process.env.SQL_SERVER ?? '.\\SQLEXPRESS';
    const database = process.env.SQL_DATABASE ?? 'Graduation Project';
    const driver = process.env.SQL_ODBC_DRIVER ?? 'ODBC Driver 17 for SQL Server';
    const brace = (value: string) => `{${value.replaceAll('}', '}}')}}`;
    const config: Mssql.config & { connectionString: string } = {
      server, database, driver,
      connectionString: `Driver=${brace(driver)};Server=${brace(server)};Database=${brace(database)};Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate=Yes;`,
      options: { trustedConnection: true, encrypt: true, trustServerCertificate: true },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    };
    this.pool = await new sql.ConnectionPool(config).connect();
  }

  async onModuleDestroy(): Promise<void> { await this.pool?.close(); }

  request(transaction?: Mssql.Transaction): Mssql.Request {
    if (transaction) return new sql.Request(transaction);
    if (!this.pool) throw new Error('SQL Server chưa kết nối.');
    return this.pool.request();
  }

  async transaction<T>(action: (transaction: Mssql.Transaction) => Promise<T>,
    isolation = sql.ISOLATION_LEVEL.READ_COMMITTED): Promise<T> {
    if (!this.pool) throw new Error('SQL Server chưa kết nối.');
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin(isolation);
    try {
      const value = await action(transaction);
      await transaction.commit();
      return value;
    } catch (error) {
      if (!transaction['_aborted' as keyof Mssql.Transaction]) {
        try { await transaction.rollback(); } catch { /* retain the original error */ }
      }
      throw error;
    }
  }
}
