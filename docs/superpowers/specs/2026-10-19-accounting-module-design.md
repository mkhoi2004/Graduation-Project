# Accounting Module Design

## Intent

Build the real `/accounting` module for the clinic so accounting staff can reconcile money received from Reception, recognized revenue and material cost from Doctor, and supplier obligations from Warehouse without mixing cash flow, performance, and debt.

The module must preserve traceability to the original intake, examination, payment, or warehouse document. Posted accounting records are immutable: corrections happen through linked reversal or adjustment records with a mandatory reason and audit trail.

## Confirmed scope

- `/accounting/overview`: separate Cash flow, Performance, and Debt views under shared filters.
- `/accounting/cash`: receipts/payments, supplier invoices, payment/document status, non-cash inventory losses, and cash reconciliation.
- `/accounting/debts`: patient receivables and supplier payables with aging buckets and payments.
- Reception payments are recorded immediately as patient advances; revenue is recognized only when the examination is completed.
- Warehouse cost excludes VAT. Service tax classification and rate are manually confirmed by accounting; the default is blank/zero.
- Reception collects patient money. Accounting handles debt settlement, refunds, invoices, tax confirmation, reconciliation, and adjustments.
- Seed data is fake operational data only and must not include a fabricated clinic legal identity.

## Explicitly removed from scope

- Retail sales.
- Laboratory expenses or laboratory payables.
- Treatment contracts, instalment schedules, and instalment receipts.
- Business document number prefixes `PT`, `PC`, and `LB`; accounting records use database identifiers and source document codes instead.
- The automatic seven-day missing-invoice reminder.
- Configurable approval thresholds and invoice/warehouse amount-difference thresholds.
- Fake clinic legal-name, tax-code, or registered-address seed data.

Supplier invoice fields remain available, but buyer identity cannot be auto-validated until real clinic legal details are configured outside this feature. Duplicate invoice detection by invoice number, series, and supplier tax code remains required.

## Confirmed implementation calls

- Supplier payable principal always comes from the posted warehouse receipt. Linking one or more invoices never rewrites that principal. Any non-zero difference between linked invoice totals and linked receipt totals requires an explanatory note; no configurable difference threshold exists.
- A reversal uses the date on which the reversal is performed. If the source belongs to a locked period, the linked reversal is posted in the current open period and the original period remains unchanged.
- Tax fields imported from another role are the explicit pre-lock metadata exception to general ledger immutability. Accounting may confirm or correct those tax fields with before/after audit records while the period is open. Once confirmed or period-locked, tax changes require a linked adjustment record.
- Examination settlement first allocates successful payments attached to that intake, then consumes any older unallocated patient advances in FIFO order. Every allocation remains linked to its original payment/cash entry so it can be reversed independently.
- Existing service prices and Doctor event revenue are pre-tax values. Accounting-confirmed tax is added to determine the gross patient amount due; recognized service revenue in the performance view remains net of tax, while tax is reported separately.
- When recording consumed supplies for an examination with multiple services, the doctor assigns each supply usage to one intake-service line. The doctor sees service identity and quantity but never the supply price. The resulting batch cost is attributed to that service line; no proportional auto-allocation is used.
- Refund workflow is `PENDING_APPROVAL → APPROVED/REJECTED`. Accounting staff create the request and an Admin other than the creator approves it. Only approval creates the cash-out reversal.
- Cash reconciliation covers `CASH` payment-method entries only. Opening balance is the preceding confirmed closing balance; calculated closing is opening plus cash in minus cash out. The confirmer must be a different user from the recorder.

## Core accounting rules

### Three independent views

1. **Cash flow** contains only actual money in or out. Patient payments, supplier payments, card fees, and refunds belong here.
2. **Performance** contains recognized service revenue and consumed-supply cost. Supply cost never creates a cash payment.
3. **Debt** contains recognized but unpaid receivables and payables. Debt settlement creates or links a cash entry but does not change the original principal.

No aggregate may add values from different views. Inventory loss is non-cash and must be excluded from every cash total.

### Examination settlement

For completed examination revenue `D` and total paid patient advances `T`:

- `T < D`: create patient receivable `D - T`.
- `T = D`: close without a debt.
- `T > D`: keep the surplus as a patient advance or create an approved refund reversal. Because contracts and instalments are removed, retained advances are attached directly to the patient and may be allocated to a later intake.

For a cancelled examination, recognized revenue is zero. Consumed supply cost remains a performance cost. Existing advances are retained for the patient or refunded using a reversal cash entry.

### Immutability and reversals

- Posted cash, performance, debt-principal, loss, and allocation records cannot be updated or deleted.
- A reversal is a new positive-valued record with a reversal direction/flag, linked to the original record and carrying a mandatory reason and actor.
- Unlocking a posted examination creates reversal events for its accounting effects before allowing replacement events.
- Cancelling a posted warehouse receipt creates a payable reversal. Cancellation is blocked if any payment allocation exists against that payable.
- Period locks reject posting, tax edits, reversals, allocations, or reconciliation changes whose effective date is in a locked period. Adjustments must be dated in an open period.

## Event ingestion

`AccountingEvent` is the idempotent boundary for Reception, Doctor, and Warehouse. Its uniqueness key is `(sourceType, sourceCode, eventType, idempotencyKey)`.

- Reception emits `PATIENT_ADVANCE_PAID` from a successful `Payment`.
- Doctor emits `EXAMINATION_COMPLETED`, `EXAMINATION_CANCELLED`, and `EXAMINATION_REVERSED` with one payload line per intake service and one cost allocation per consumed inventory batch.
- Warehouse emits `PURCHASE_PAYABLE_CREATED`, `INVENTORY_LOSS_RECORDED`, `INVENTORY_USAGE_RECORDED`, and reversal events.

Processing an event and creating all accounting records occur in one serializable database transaction. Reprocessing the same event returns the already-created result.

## Data model

### Existing models extended

- `DentalService`: `serviceType` (`TREATMENT` or `AESTHETIC`), optional `taxClassification`, optional `defaultTaxRate`.
- `Payment`: a stable accounting event key and relation to the generated cash entry.
- `AccountingOutbox`: payload expanded to service-line revenue and batch-level cost allocations; its examination uniqueness remains the idempotency anchor.
- `AccountingWarehouseEntry`: becomes a source event record only; accounting ledger rows are produced from it.
- `User` and `ClinicRoom`: relations to accounting records for actor and room filtering.

### New models

- `AccountingEvent`: source identity, event type, idempotency key, payload snapshot, status, error, processed time.
- `AccountingEntry`: append-only common ledger record with view (`CASH`, `PERFORMANCE`, `LOSS`), direction, category, effective date, room, patient/supplier, source identity, monetary fields, payment/document status, method, transaction code, reversal link, reason, actor, approver, and tax snapshot.
- `PerformanceLine`: one immutable line per completed/cancelled intake service with recognized revenue, allocated supply cost, doctor, room, service type, and tax snapshot.
- `Debt`: immutable principal for `PATIENT_RECEIVABLE` or `SUPPLIER_PAYABLE`, source identity, due date, principal, status, and reversal link.
- `DebtPaymentAllocation`: append-only allocation from a cash entry to a debt; the debt balance is derived from principal minus non-reversed allocations.
- `PatientAdvanceAllocation`: append-only allocation of a patient cash advance to an examination/intake settlement.
- `SupplierInvoice`: invoice number, series, date, supplier tax code snapshot, buyer fields entered by the accountant, goods amount, tax, total, attachment metadata, and document validity status.
- `SupplierInvoiceStockDocument`: many-to-many link between invoices and warehouse receipts.
- `AccountingPeriodLock`: unique year/month, locked time, actor, and reason.
- `CashReconciliation`: business date, room, calculated cash balance, counted balance, difference, reason, actor, confirmer, and confirmation time.
- `AccountingAuditLog`: entity type/id, action, actor, before/after snapshots, reason, and time.

All VND monetary totals are integers. Tax rates use a decimal type. Tax entered by rate is rounded to VND per line; tax entered as an amount derives the displayed rate. `total = preTax + tax` and is never directly editable.

## API design

All routes use `AccountingAccessGuard`; accounting staff and admin can read. Only accounting staff perform accounting operations, while admin may edit service tax metadata and period locks. Existing role guards remain unchanged for other modules.

- `GET /accounting/overview` returns the three independent aggregate blocks and filter applicability metadata.
- `GET /accounting/cash` returns paginated cash records; `GET /accounting/losses` returns non-cash losses.
- `POST /accounting/refunds` creates a linked reversal/refund with reason.
- `POST /accounting/expenses` creates a non-supplier administrative or material cash payment. Laboratory and retail categories are absent.
- `PUT /accounting/entries/:id/tax` confirms tax before period lock while preserving an audit log.
- `GET/POST /accounting/supplier-invoices` and `POST /accounting/supplier-invoices/:id/stock-documents` manage invoice data and M:N links.
- `GET /accounting/debts` returns balances and aging; `POST /accounting/debts/:id/payments` settles a debt partially or fully.
- `POST /accounting/reconciliations` records and confirms end-of-day cash counts.
- `POST /accounting/period-locks` locks a month.
- `GET /accounting/source/:type/:code` returns a safe deep-link target/summary for the originating module.

Every mutation validates non-negative money, tax rate 0–100, non-future effective dates, open periods, role, room access where data exists, required reversal reasons, and immutable posted state.

## UI design

### Shared accounting layout

Reuse the Warehouse module's header, responsive navigation, loading skeletons, error panels, cards, filters, and table styling. Tabs are `Tổng quan`, `Thu / chi`, and `Công nợ`. Dates render as `dd/MM/yyyy`; money uses Vietnamese thousands separators and `đ`.

### Overview

A single filter bar controls date range, clinic room, service type, and supply type. Each block reports which filters apply; unsupported filters visibly dim the block and explain why.

- Cash flow: money in, money out, net cash, unique source-document count, prior-period comparison, cash-in/out/payment-method donut breakdowns, missing-invoice count, unallocated patient advances, and manually entered tax total.
- Performance: recognized revenue, consumed-supply cost, gross profit, with service/doctor/room breakdowns.
- Debt: receivable and payable balances plus 0–30, 31–60, 61–90, and over-90-day aging rows. No debt pie chart.

Charts are lightweight accessible SVG components with labels and list equivalents; categories over six are grouped as `Khác`. Selecting a cash slice navigates to `/accounting/cash` with equivalent query filters.

### Cash

The main tab is one row per actual money movement, with all required date, room, category, direction, tax, total, method, transaction, counterparty, source, status, actor, and approver columns. Filters mirror the specification except removed categories.

Secondary sections provide supplier-invoice capture/linking and cash reconciliation. A separate `Tổn thất (không dòng tiền)` tab displays warehouse disposal losses and never contributes to cash totals.

### Debts

Separate patient receivables and supplier payables. Each row shows original source, age bucket, principal, paid amount, remaining balance, and status. The payment dialog permits partial settlement and creates a cash entry plus allocation atomically. Original principal fields are read-only.

## Cross-module changes required

### Reception

- Convert successful cash/MoMo payments into idempotent patient-advance accounting events immediately.
- Add transfer/card methods and transaction code support only where needed by the cash ledger; partial payments and deposits use the same payment model.
- Keep date of birth and service quantity support already present.
- Sequence-ticket cancellation and other unrelated reception workflow additions are not part of this accounting delivery.

### Doctor

- Expand outbox payload from totals to individual service lines and batch-level supply allocations.
- Emit a reversal event when a completed/cancelled examination is unlocked.
- Continue hiding supply prices from doctors.
- Supplementary-service proposal workflow remains outside this delivery.

### Warehouse

- Consume existing `AccountingWarehouseEntry` events into payables/losses.
- Block posted receipt cancellation when its payable has any payment allocation.
- Emit linked reversal events instead of overwriting accounting effects.
- Automatic patient-use stock issues, available-stock calculations, and retail inventory are outside this delivery except where existing data is read.

## Seed and demo behavior

Seed fake patients, suppliers, receipts, completed/cancelled examinations, patient advances, receivables, payables, partial/full payments, one refund reversal, one non-cash loss, one reconciliation difference, and tax examples. Do not seed a clinic legal name, clinic tax code, clinic registered address, retail transaction, laboratory transaction, contract, instalment plan, or prefixed accounting code.

## Testing and acceptance

Backend domain/service tests cover all settlement branches, idempotency, separation of cash and cost, immutable reversals, tax calculation both ways, tax snapshot behavior, invoice duplicate detection and M:N links, paid-payable cancellation blocking, period locks, reconciliation, permission checks, and non-cash loss exclusion.

Frontend tests cover the three routes, filters, disabled-filter explanation, chart/table total equality, cash and loss tabs, debt payments, invoice validation, loading/error states, and role routing.

Integration tests prove Reception payment ingestion, Doctor completion/cancellation/reversal, and Warehouse payable/loss/reversal ingestion. `test.md` is updated only with commands actually run and their real outcomes.

## Builder decisions

- Exact component/file decomposition should follow existing feature-folder patterns.
- Use existing styling and Lucide icons; do not add a chart dependency.
- Use attachment metadata only in this delivery; binary upload/storage integration may remain unavailable if the repository has no storage provider.
- User-to-room access has no existing model. Enforce module roles now and structure filters/queries so room-scoped authorization can be added without rewriting the accounting schema.
