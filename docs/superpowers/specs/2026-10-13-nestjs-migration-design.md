# NestJS backend migration design

## Intent

Replace the C# Web API with a TypeScript NestJS API so the React frontend and backend use one language. Keep the current SQL Server `.\SQLEXPRESS` database, schema, archive triggers, account hashes, and current `/api` behavior. No new clinical or payment endpoints are introduced.

## API and data

Implement login, `me`, dashboard, patients, services, visits, users/roles, and health endpoints with existing route names, role rules, validation, doctor scoping, optimistic version checks, audit inserts, and archive deletion reason/session context. SQL uses named parameters. Multi-statement mutations use a single SQL transaction and commit only after all effects succeed. All archive context and DELETE statements run on the same connection/transaction.

Keep existing PBKDF2-SHA256 password hashes compatible with C#, including the >8-character plus special-character creation rule. Accept current local accounts without resetting them. Issue JWTs with the same issuer/audience, 30-minute lifetime, and `sub` as a decimal ID string.

SQL `BIGINT` IDs are parsed and serialized only when within JavaScript's safe integer range; otherwise reject with an explicit error until the frontend supports ID strings. SQL DECIMAL values are never converted to JavaScript `number` for arithmetic. Financial helpers use `decimal.js` with decimal strings and return decimal strings; SQL monetary parameters use validated decimal strings.

## Local operation

NestJS listens on port 5089 to keep the frontend unchanged. Windows Authentication uses `mssql/msnodesqlv8` against `.\SQLEXPRESS`. The README shows `npm ci`, `npm run dev`, and existing sample accounts. SQL schema/verification scripts remain in place. The old .NET backend is removed after the NestJS version is verified; Git history preserves it.

## Verification

Unit tests cover money precision, password hash compatibility/policy, input validation, and archive transaction behavior. Integration tests exercise login/roles, patient CRUD and audit/archive on a temporary SQL database. Build the NestJS API and React UI, run their tests, and check SQL scripts.
