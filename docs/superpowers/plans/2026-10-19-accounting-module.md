# Accounting Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/accounting` placeholder with tested accounting data, APIs, demo records, and responsive Overview, Cash, and Debt screens that keep cash flow, performance, debt, and non-cash losses separate.

**Architecture:** A NestJS `AccountingModule` consumes idempotent Reception, Doctor, and Warehouse source events into append-only Prisma accounting records. Domain functions own money/tax/aging/settlement calculations; services own transactions, role/period validation, reversals, approvals, and query aggregation. React pages consume a typed accounting API and reuse the existing Warehouse visual language without a new chart dependency.

**Tech Stack:** SQL Server, Prisma 6, NestJS 12, TypeScript 6, React 19, React Router 7, Tailwind CSS 4, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-19-accounting-module-design.md`

## Global Constraints

- Do not implement retail, laboratory, contracts, instalments, prefixed accounting codes, automatic seven-day invoice reminders, configurable approval/difference thresholds, or fake clinic legal identity.
- Existing service prices are pre-tax; performance revenue is net of tax and patient gross due includes confirmed tax.
- Use VND integer amounts and round tax at each line; never allow arbitrary negative user input.
- Posted records are append-only; corrections are linked reversals/adjustments with reason and audit.
- Reception advance allocation is intake payments first, then older patient advances FIFO.
- Doctor supply usage must identify one intake-service line; no proportional cost allocation.
- Refunds require Accounting creation and approval by a different Admin.
- Cash reconciliation includes only `CASH` entries and requires different recorder/confirmer users.
- Use `dd/MM/yyyy`, Vietnamese money formatting, and fake patient/supplier data only.
- Do not claim a test passed unless the command was actually run and passed; record real results in `test.md`.

## Review Focus

- Duplicate source event or retry with the same idempotency key must return existing results without duplicate ledger, debt, or allocation rows; covered in Task 2 service tests.
- Tax confirmation that increases gross due after an advance must create/update the correct remaining receivable without mutating net revenue; covered in Task 2 tests.
- A refund approval attempted by its creator, a non-Admin, or in a locked period must be rejected without a cash-out row; covered in Task 3 tests.
- Supplier-receipt cancellation with any debt payment allocation must be blocked even after a partial payment; covered in Task 4 tests.
- Filters that do not apply to a dashboard block must leave its data unchanged and show an explanation rather than zero; covered in Task 6 component tests.

---

### Task 1: Accounting domain and persistent model

**Files:**
- Create: `apps/api/src/accounting/accounting-domain.ts`
- Test: `apps/api/src/accounting/accounting-domain.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261019_add_accounting_module/migration.sql`

**Interfaces:**
- Produces: `calculateTax(input)`, `calculateSettlement(input)`, `ageDebt(input)`, `summarizeCash(entries)`, and `isPeriodLocked(date, locks)` pure functions.
- Produces Prisma models and relations named in the approved spec, including `AccountingEvent`, `AccountingEntry`, `PerformanceLine`, `Debt`, `DebtPaymentAllocation`, `PatientAdvanceAllocation`, `SupplierInvoice`, `SupplierInvoiceStockDocument`, `RefundRequest`, `AccountingPeriodLock`, `CashReconciliation`, and `AccountingAuditLog`.

- [ ] **Step 1: Write failing domain tests**

Add focused tests for percentage tax, reverse-derived rate, VND rounding, invalid rates/amounts, `T < D`, `T = D`, `T > D`, cancelled examination, four aging buckets, cash-only totals, reversals, and non-cash loss exclusion.

- [ ] **Step 2: Run the domain test and verify RED**

Run: `npm test --workspace api -- accounting-domain.spec.ts`

Expected: FAIL because `accounting-domain.ts` does not exist.

- [ ] **Step 3: Implement the minimal pure domain functions**

Use explicit integer outputs and discriminated result types. Keep Prisma and clocks out of this file.

- [ ] **Step 4: Run the domain test and verify GREEN**

Run: `npm test --workspace api -- accounting-domain.spec.ts`

Expected: PASS.

- [ ] **Step 5: Extend Prisma schema and write the SQL migration**

Use SQL Server-compatible indexes/unique constraints, including source-event idempotency and supplier-invoice duplicate keys. Add `intakeServiceId` to `ExaminationSupply`, service tax metadata to `DentalService`, and accounting relations without deleting existing outbox models.

- [ ] **Step 6: Generate Prisma client and validate schema**

Run: `npm run db:generate`

Expected: Prisma generation succeeds with no schema errors.

### Task 2: Idempotent event ingestion and examination settlement

**Files:**
- Create: `apps/api/src/accounting/accounting.service.ts`
- Create: `apps/api/src/accounting/accounting.service.spec.ts`
- Create: `apps/api/src/accounting/accounting.module.ts`
- Create: `apps/api/src/accounting/accounting.guard.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 domain functions and Prisma models.
- Produces: `ingestReceptionPayment(paymentId, idempotencyKey)`, `ingestDoctorEvent(outboxId, idempotencyKey)`, `ingestWarehouseEvent(entryId, idempotencyKey)`, `confirmTax(entryId, input, actor)`, `getOverview(filters)`, `getCash(filters)`, `getLosses(filters)`, and `getDebts(filters)`.

- [ ] **Step 1: Write failing service tests for source ingestion**

Cover successful Reception advance, duplicate retry, completed examination service lines, cancelled examination cost with zero revenue, intake-first then patient FIFO allocation, all three settlement branches, tax-gross receivable changes, batch cost assigned to the selected service, warehouse payable/loss/usage, and non-cash loss exclusion.

- [ ] **Step 2: Run the service test and verify RED**

Run: `npm test --workspace api -- accounting.service.spec.ts`

Expected: FAIL because `AccountingService` is missing.

- [ ] **Step 3: Implement ingestion in serializable transactions**

Create one `AccountingEvent` before derived rows, enforce its composite unique key, and return existing derived records on retry. Write append-only cash, performance, debt, loss, and allocation rows.

- [ ] **Step 4: Implement tax confirmation and read models**

Allow audited tax metadata edits only while open/unconfirmed. Keep net performance revenue unchanged, calculate patient gross due, and expose filter-applicability metadata from overview queries.

- [ ] **Step 5: Run focused and existing API suites**

Run: `npm test --workspace api -- accounting.service.spec.ts`

Expected: PASS.

Run: `npm test --workspace api`

Expected: all API unit tests PASS; report any unrelated failure by name.

### Task 3: Accounting mutations and controller

**Files:**
- Create: `apps/api/src/accounting/dto/accounting.dto.ts`
- Create: `apps/api/src/accounting/accounting.controller.ts`
- Create: `apps/api/src/accounting/accounting.controller.spec.ts`
- Modify: `apps/api/src/accounting/accounting.service.ts`
- Modify: `apps/api/src/accounting/accounting.module.ts`

**Interfaces:**
- Consumes: Task 2 service queries/ingestion.
- Produces: the approved `/accounting` HTTP routes for overview, cash, losses, debts, tax, expenses, supplier invoices, debt payments, refund request/approval, reconciliations, period locks, and source summaries.

- [ ] **Step 1: Write failing controller/service tests for validations and workflows**

Cover non-negative money, tax 0–100, non-future dates, locked period, duplicate invoice, invoice M:N linking, any invoice/receipt difference requiring a note, partial/full debt payment, refund creator/admin separation, refund state transitions, cash-only reconciliation, prior confirmed closing, and recorder/confirmer separation.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm test --workspace api -- accounting.controller.spec.ts accounting.service.spec.ts`

Expected: FAIL on missing controller/mutation methods.

- [ ] **Step 3: Implement DTOs, routes, guard, and minimal service mutations**

Use class-validator DTOs and `AccountingAccessGuard`. Build all writes from append-only records and audit logs. Store attachment metadata only.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test --workspace api -- accounting.controller.spec.ts accounting.service.spec.ts`

Expected: PASS.

### Task 4: Wire Reception, Doctor, and Warehouse

**Files:**
- Modify: `apps/api/src/reception/reception.service.ts`
- Modify: `apps/api/src/reception/reception.service.spec.ts`
- Modify: `apps/api/src/doctor/dto/doctor.dto.ts`
- Modify: `apps/api/src/doctor/doctor.service.ts`
- Modify: `apps/api/src/doctor/doctor.service.spec.ts`
- Modify: `apps/api/src/doctor/stubs/accounting-stub.service.ts`
- Modify: `apps/api/src/warehouse/warehouse.service.ts`
- Modify: `apps/api/src/warehouse/warehouse.service.spec.ts`
- Modify: `apps/web/src/features/doctor/doctor-types.ts`
- Modify: `apps/web/src/features/doctor/steps/supplies-step.tsx`
- Modify: `apps/web/src/features/doctor/doctor-steps.test.tsx`

**Interfaces:**
- Consumes: Task 2 ingestion service/event payload definitions.
- Produces: source events containing payment identity, service-line revenue, `intakeServiceId` on supply usage, batch-level cost allocations, and reversal identities.

- [ ] **Step 1: Add failing Reception payment event tests**

Assert successful cash and gateway payments create one advance source event and retries are idempotent.

- [ ] **Step 2: Add failing Doctor payload and UI tests**

Assert each supply usage requires a selected intake service, completion/cancellation sends service lines and batch cost allocations, unlock emits a reversal, and the doctor UI never shows cost.

- [ ] **Step 3: Add failing Warehouse integration tests**

Assert posting creates payable/loss/usage events, cancellation creates reversal, and receipt cancellation is blocked after any payable allocation.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `npm test --workspace api -- reception.service.spec.ts doctor.service.spec.ts warehouse.service.spec.ts`

Run: `npm test --workspace web -- doctor-steps.test.tsx`

Expected: targeted new assertions FAIL.

- [ ] **Step 5: Implement minimal cross-module changes**

Preserve current module behavior and guards. Link existing outbox records rather than adding a second delivery mechanism.

- [ ] **Step 6: Re-run focused tests and verify GREEN**

Run the same commands; expected PASS.

### Task 5: Accounting web foundation and routing

**Files:**
- Create: `apps/web/src/features/accounting/accounting-types.ts`
- Create: `apps/web/src/features/accounting/accounting-api.ts`
- Create: `apps/web/src/features/accounting/accounting-format.ts`
- Create: `apps/web/src/features/accounting/accounting-format.test.ts`
- Create: `apps/web/src/features/accounting/accounting-layout.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: typed fetch functions for every Task 3 route; `formatVnd`, `formatAccountingDate`, and route-safe filter helpers; nested protected routes `/accounting`, `/accounting/cash`, `/accounting/debts`.

- [ ] **Step 1: Write failing formatting and route tests**

Assert Vietnamese money/date output, query-filter encoding, accounting role access, non-accounting redirect, nested route rendering, and logout.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test --workspace web -- accounting-format.test.ts App.test.tsx`

Expected: FAIL on missing accounting files/routes.

- [ ] **Step 3: Implement types, API client, helpers, layout, and routes**

Reuse authorized-header/session and Warehouse layout patterns. Admin may enter only the refund-approval/tax-admin flows exposed by API; normal `/accounting` access remains Accounting staff.

- [ ] **Step 4: Run tests and verify GREEN**

Run the same command; expected PASS.

### Task 6: Accounting overview screen

**Files:**
- Create: `apps/web/src/features/accounting/accounting-overview-page.tsx`
- Create: `apps/web/src/features/accounting/accounting-overview-page.test.tsx`
- Create: `apps/web/src/features/accounting/accounting-donut.tsx`

**Interfaces:**
- Consumes: `fetchAccountingOverview(filters)` from Task 5.
- Produces: accessible shared filters, cash KPIs/breakdowns, performance KPIs/breakdowns, debt balances/aging, filter applicability notices, and slice-to-cash navigation.

- [ ] **Step 1: Write failing overview tests**

Assert all three blocks remain separate, source-document count is unique, prior-period comparison labels are correct, chart values equal table/aggregate values, categories over six group to `Khác`, selecting a slice navigates with filters, debt has no pie chart, and unsupported filters dim/explain without zeroing data.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test --workspace web -- accounting-overview-page.test.tsx`

Expected: FAIL because the page is missing.

- [ ] **Step 3: Implement the overview and accessible SVG donut**

Do not add chart dependencies. Include labeled list equivalents for every SVG visualization.

- [ ] **Step 4: Run test and verify GREEN**

Run the same command; expected PASS.

### Task 7: Cash, invoices, losses, reconciliation, and debts screens

**Files:**
- Create: `apps/web/src/features/accounting/accounting-cash-page.tsx`
- Create: `apps/web/src/features/accounting/accounting-cash-page.test.tsx`
- Create: `apps/web/src/features/accounting/accounting-debts-page.tsx`
- Create: `apps/web/src/features/accounting/accounting-debts-page.test.tsx`
- Create: `apps/web/src/features/accounting/accounting-ui.tsx`

**Interfaces:**
- Consumes: Task 5 API functions and formats.
- Produces: cash and non-cash loss tabs, server-backed filters, tax confirmation, supplier-invoice M:N form, refund request/status display, end-of-day cash reconciliation, receivable/payable aging tables, and partial/full debt-payment dialog.

- [ ] **Step 1: Write failing cash page tests**

Assert required columns/filters, cash totals exclude loss, money paid without a valid invoice remains cash-out but not valid expense, duplicate invoice and missing difference note errors, tax by rate and amount, refund pending/approved states, and reconciliation difference/reason.

- [ ] **Step 2: Write failing debt page tests**

Assert receivable/payable tabs, four age buckets, read-only principal, partial/full payment transitions, source links, and loading/error states.

- [ ] **Step 3: Run page tests and verify RED**

Run: `npm test --workspace web -- accounting-cash-page.test.tsx accounting-debts-page.test.tsx`

Expected: FAIL because pages are missing.

- [ ] **Step 4: Implement shared UI and both pages**

Keep forms keyboard-accessible, use semantic tables, and avoid rendering supply quantities as accounting metrics.

- [ ] **Step 5: Run page tests and verify GREEN**

Run the same command; expected PASS.

### Task 8: Demo data, integration coverage, and verification record

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Create: `apps/api/test/accounting.e2e-spec.ts`
- Modify: `test.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: repeatable fake accounting demo state and an evidence-backed test record.

- [ ] **Step 1: Write failing accounting e2e tests**

Cover auth, overview, Reception advance, all settlement branches, cancelled examination retain/refund paths, idempotency, tax confirmation, supplier payable/loss ingestion, invoice duplicate/M:N/difference note, paid-payable cancellation block, refund approval, period lock, reconciliation, role restrictions, and room/service/supply filters.

- [ ] **Step 2: Run e2e test and verify RED**

Run: `npm run test:e2e --workspace api -- accounting.e2e-spec.ts`

Expected: new assertions FAIL before final wiring/seed setup.

- [ ] **Step 3: Extend idempotent seed data**

Seed every approved scenario and omit every explicitly removed item and legal identity field.

- [ ] **Step 4: Complete e2e wiring and verify GREEN**

Run: `npm run test:e2e --workspace api -- accounting.e2e-spec.ts`

Expected: PASS when test database configuration is available; otherwise record `Not tested` with the exact environmental reason.

- [ ] **Step 5: Run full verification**

Run: `npm run db:generate`

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Expected: all commands PASS. Any pre-existing or environment-dependent failure is named precisely and not reported as a pass.

- [ ] **Step 6: Update `test.md` with actual results**

Record each requested accounting test case, its command or test file, actual Pass/Fail/Not tested status, and reason. Do not copy expected results as actual results.
