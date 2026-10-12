# Dental ERP implementation plan

> **For agentic workers:** Implement in order. Verify each stage before moving to the next.

**Goal:** Deliver a SQL Server schema with archive-on-delete, a .NET Web API, and a React UI for the core dental workflow defined in `Quy_trinh_NhaKhoa_TongHop_v14.md`.

**Architecture:** SQL Server enforces PK/FK/checks and archival. ASP.NET Core exposes validated resources and business operations using parameterized SQL. React consumes the API through one client and presents searchable lists/forms.

**Tech Stack:** SQL Server T-SQL, .NET 10 Web API with Microsoft.Data.SqlClient, React/Vite/TypeScript.

**Spec:** `Quy_trinh_NhaKhoa_TongHop_v14.md` plus the user's three-stage roadmap.

## Global constraints

- Database name: `Graduation Project`; server confirmed by user: `.\SQLEXPRESS`.
- Every main table has PK/FK/checks as applicable and a corresponding `_Deleted` archive with deletion metadata.
- Delete is atomic: the trigger removes the base row and writes the archive in one statement. Any FK or archive-write failure requires transaction rollback.
- No BHYT billing logic.
- Deliver stage 1, then stage 2, then stage 3. SQL Server `SQLEXPRESS` was verified live.

## Review focus

- Delete with dependent rows must fail without orphaning either live or archive data.
- Multirow DELETE archives every row exactly once with the authenticated actor.
- Duplicate payment/service events must not create duplicate money or stock effects.
- API must reject invalid input and unauthorized writes at the server.
- UI must show server validation failures and avoid optimistic deletion claims.

## Task 1: SQL schema and archive

**Files:** `database/001_schema.sql`, `database/002_archive.sql`, `database/003_hardening.sql`, `database/verify.sql`, `database/verify_hardening.sql`.

- [x] Write verification SQL for schema, constraints, multirow archive, rollback on FK/archive-write failure.
- [x] Run it against `SQLEXPRESS`.
- [x] Implement tables, PK/FK/check/defaults, indexes and archive generation/INSTEAD OF DELETE triggers.
- [x] Run live verification and inspect trusted/enabled constraints.

## Task 2: API

**Files:** `backend/Graduation.Api/*`, `backend/Graduation.Api.Tests/*`.

- [x] Add tests for validation, password hashing and billing arithmetic.
- [x] Create solution, DTOs, repositories, controllers, exception handling and logging for core CRUD.
- [x] Build and run tests; use parameterized SQL and archive-aware DELETE.

## Task 3: React UI

**Files:** `frontend/*`.

- [x] Test patient form and deletion confirmation.
- [x] Create Vite React app with API client, routes/layout, dashboard, patient/visit/catalog lists and forms.
- [x] Build and verify UI; document setup and remaining domain modules.
