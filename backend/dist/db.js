var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { createRequire } from 'node:module';
import { Injectable } from '@nestjs/common';
const require = createRequire(import.meta.url);
export const sql = require('mssql/msnodesqlv8');
let Database = class Database {
    pool;
    async onModuleInit() {
        const server = process.env.SQL_SERVER ?? '.\\SQLEXPRESS';
        const database = process.env.SQL_DATABASE ?? 'Graduation Project';
        const driver = process.env.SQL_ODBC_DRIVER ?? 'ODBC Driver 17 for SQL Server';
        const brace = (value) => `{${value.replaceAll('}', '}}')}}`;
        const config = {
            server, database, driver,
            connectionString: `Driver=${brace(driver)};Server=${brace(server)};Database=${brace(database)};Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate=Yes;`,
            options: { trustedConnection: true, encrypt: true, trustServerCertificate: true },
            pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
        };
        this.pool = await new sql.ConnectionPool(config).connect();
    }
    async onModuleDestroy() { await this.pool?.close(); }
    request(transaction) {
        if (transaction)
            return new sql.Request(transaction);
        if (!this.pool)
            throw new Error('SQL Server chưa kết nối.');
        return this.pool.request();
    }
    async transaction(action, isolation = sql.ISOLATION_LEVEL.READ_COMMITTED) {
        if (!this.pool)
            throw new Error('SQL Server chưa kết nối.');
        const transaction = new sql.Transaction(this.pool);
        await transaction.begin(isolation);
        try {
            const value = await action(transaction);
            await transaction.commit();
            return value;
        }
        catch (error) {
            if (!transaction['_aborted']) {
                try {
                    await transaction.rollback();
                }
                catch { /* retain the original error */ }
            }
            throw error;
        }
    }
};
Database = __decorate([
    Injectable()
], Database);
export { Database };
