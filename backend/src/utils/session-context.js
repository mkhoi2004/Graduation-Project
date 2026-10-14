import { QueryTypes } from 'sequelize';

/**
 * Set the current username into SQL Server SESSION_CONTEXT for soft-delete triggers.
 * Must be executed within the same transaction/connection as the DELETE statement.
 */
export async function setSessionUser(sequelize, transaction, username) {
  if (!username) {
    throw new Error('Username is required to set SESSION_CONTEXT');
  }
  await sequelize.query(
    `EXEC sys.sp_set_session_context @key=N'username', @value=:username, @read_only=0;`,
    {
      transaction,
      replacements: { username: String(username).trim() },
      type: QueryTypes.RAW,
    },
  );
}

/**
 * Reset SESSION_CONTEXT username after delete.
 */
export async function clearSessionUser(sequelize, transaction) {
  await sequelize.query(
    `EXEC sys.sp_set_session_context @key=N'username', @value=NULL, @read_only=0;`,
    {
      transaction,
      type: QueryTypes.RAW,
    },
  );
}
