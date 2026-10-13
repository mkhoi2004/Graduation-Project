# NestJS Backend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the .NET API with a NestJS API while preserving local SQL Server data and React API behavior.

**Architecture:** NestJS controllers call focused services backed by parameterized `mssql/msnodesqlv8` queries. A database provider owns the pool and transaction helper; SQL archive triggers remain authoritative. Money calculations use `decimal.js`.

**Tech Stack:** Node.js 24, TypeScript, NestJS, node-mssql with msnodesqlv8, decimal.js, Vitest, SQL Server Express.

**Spec:** `docs/superpowers/specs/2026-10-13-nestjs-migration-design.md`

## Global Constraints

- Keep the existing `/api` routes and response shapes for React.
- Preserve PBKDF2 hashes and current SQL data.
- Never use JavaScript number arithmetic for money.
- Use one SQL transaction for each multi-statement mutation.

## Review Focus

- SQL `BIGINT` outside JS safe range must fail explicitly.
- A failed archive delete must not commit audit or archive context.
- Doctor role must only see assigned patients/visits.
- Existing C# PBKDF2 hashes must verify in Node.
- SQL `DECIMAL` precision must survive calculations.

---

### Task 1: Runtime and pure contracts

**Files:** `backend/package.json`, `backend/tsconfig.json`, `backend/src/security/password.ts`, `backend/src/billing/money.ts`, `backend/src/validation.ts`, matching `backend/test/*.test.ts`.

- [x] Write unit tests for existing hash verification, password policy, patient validation, safe IDs, and exact decimal arithmetic.
- [x] Run tests and confirm RED from missing implementation.
- [x] Implement the pure contracts and run tests to GREEN.

### Task 2: Database and authentication

**Files:** `backend/src/db.ts`, `backend/src/auth.ts`, `backend/src/app.module.ts`, `backend/src/main.ts`, transaction/auth tests.

- [x] Add tests for SQL transaction rollback and login/JWT behavior.
- [x] Run tests RED, implement parameterized database access and auth, run GREEN.

### Task 3: Clinical/admin API parity

**Files:** `backend/src/patients.ts`, `backend/src/services.ts`, `backend/src/visits.ts`, `backend/src/users.ts`, `backend/src/dashboard.ts`, `backend/src/archive.ts`, API tests.

- [x] Add behavioral tests for validation, doctor scoping, optimistic update, archive/audit transaction.
- [x] Run RED, implement endpoints, run GREEN.

### Task 4: Local integration and documentation

**Files:** `backend/test/integration.ps1`, `README.md`, `docs/SETUP.md`, `.gitignore`.

- [x] Run temporary-database SQL/API integration, including three role logins, CRUD and archive/audit.
- [x] Build both apps and run all tests.
- [x] Remove the superseded .NET backend files once parity is verified; update local run instructions to Node/NestJS.
