import { Sequelize, QueryTypes } from 'sequelize';

export const FOUNDATION_VERSION = '001-full-schema';

export function createDatabase(config) {
  const options = {
    encrypt: config.encrypt,
    trustServerCertificate: config.trustServerCertificate,
    connectTimeout: config.connectTimeout,
    requestTimeout: config.connectTimeout,
    useUTC: true,
    ...(config.port ? { port: config.port } : { instanceName: config.instance }),
  };
  const sequelize = new Sequelize(config.name, config.user, config.password, {
    dialect: 'mssql', host: config.server, logging: false,
    dialectOptions: { options },
    pool: { max: 5, min: 0, acquire: config.connectTimeout + 1000, idle: 10000 },
    retry: { max: 0 },
    define: { freezeTableName: true, timestamps: false },
  });

  async function checkDatabase() {
    if (!config.user || !config.password) {
      const error = new Error('Set DB_USER and DB_PASSWORD in backend/.env');
      error.code = 'DB_CREDENTIALS_MISSING';
      throw error;
    }
    const rows = await sequelize.query(
      'SELECT MigrationId FROM dbo.SchemaMigrations WHERE MigrationId = :version',
      { replacements: { version: FOUNDATION_VERSION }, type: QueryTypes.SELECT },
    );
    if (rows.length !== 1) {
      const error = new Error('Run database/bootstrap.sql in SQLCMD mode first');
      error.code = 'DB_SCHEMA_MISSING';
      throw error;
    }
    // Check critical objects as well as the migration marker.
    await sequelize.query('SELECT TOP (0) UserId, RoleId, BranchId, PasswordHash, IsApprover, Version FROM dbo.Users');
    await sequelize.query('SELECT TOP (0) AuditId, Outcome FROM dbo.AccessAuditLogs');
    await sequelize.query('SELECT TOP (0) [Key], Scope, RequestHash FROM dbo.IdempotencyKeys');
  }
  return { sequelize, checkDatabase, close: () => sequelize.close() };
}
