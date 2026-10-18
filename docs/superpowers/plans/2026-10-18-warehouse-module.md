# Warehouse Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng module `/warehouse` dùng được với tồn theo lô, FEFO/FIFO, nhập/xuất, in/ghi sổ, dữ liệu mẫu và ba màn hình theo vai trò.

**Architecture:** `WarehouseModule` của NestJS sở hữu quy tắc chứng từ, lô và ledger; Prisma transaction là ranh giới nhất quán. React dùng layout lồng ba route và gọi REST qua một client tập trung; `MedicalSupply.inStock` chỉ là số dư tương thích được cập nhật cùng sổ lô.

**Tech Stack:** NestJS, TypeScript, Prisma, SQL Server, class-validator, React, React Router, Tailwind CSS, Lucide React, Vitest/Jest.

**Spec:** `docs/superpowers/specs/2026-10-18-warehouse-module-design.md`

## Global Constraints

- Chỉ `WAREHOUSE_MANAGEMENT` và `ADMIN` được dùng API/màn hình kho.
- Phiếu bệnh nhân chỉ sinh tự động từ lượt khám; không tạo thủ công tại kho.
- Không xuất âm; FEFO trước, FIFO khi không có hạn; lô hết hạn chỉ được xuất hủy.
- Phiếu đã in không sửa; phiếu đã ghi sổ chỉ đảo bằng chứng từ mới.
- SQL Server là cơ sở dữ liệu đích và migration phải bảo toàn dữ liệu hiện có.

## Review Focus

- Hai yêu cầu ghi sổ trùng `idempotencyKey` chỉ tạo một ledger/outbox.
- Tổng tồn lô khác `MedicalSupply.inStock` phải bị phát hiện, không âm thầm tiếp tục.
- Ngày hết hạn đúng ngày hiện tại bị xem là hết hạn cho xuất thường.
- Chứng từ nhiều dòng thiếu tồn ở một dòng phải rollback tất cả.
- Người dùng đổi route trực tiếp khi sai role phải bị chuyển về route theo role.

---

### Task 1: Miền nghiệp vụ và schema kho

**Files:**
- Create: `apps/api/src/warehouse/warehouse-domain.ts`
- Create: `apps/api/src/warehouse/warehouse-domain.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/*_add_warehouse_module/migration.sql`

**Interfaces:**
- Produces: `calculateReceiptLine`, `allocateStock`, `classifyBatch`, các model kho trong Prisma.

- [ ] Viết test fail cho quy đổi/VAT, FEFO/FIFO, loại lô hết hạn và thiếu tồn.
- [ ] Chạy test đích và xác nhận fail vì hàm chưa tồn tại.
- [ ] Viết tối thiểu các hàm domain để test pass.
- [ ] Thêm model/enum/index/quan hệ Prisma và migration SQL Server.
- [ ] Chạy test domain và `prisma validate`.

### Task 2: API, transaction ghi sổ và phân quyền

**Files:**
- Create: `apps/api/src/warehouse/dto/warehouse.dto.ts`
- Create: `apps/api/src/warehouse/warehouse.controller.ts`
- Create: `apps/api/src/warehouse/warehouse.service.ts`
- Create: `apps/api/src/warehouse/warehouse.guard.ts`
- Create: `apps/api/src/warehouse/warehouse.module.ts`
- Create: `apps/api/src/warehouse/warehouse.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: domain functions và Prisma models Task 1.
- Produces: các endpoint `/warehouse/overview`, `/items`, `/usage`, `/documents`, tạo/in/ghi sổ/hủy/đảo.

- [ ] Viết test fail cho trạng thái, idempotency, rollback thiếu tồn và quyền role.
- [ ] Chạy test đích, xác nhận fail đúng nguyên nhân.
- [ ] Cài DTO/controller/guard/service với Prisma transaction và audit/outbox.
- [ ] Chạy test API và toàn bộ test backend.

### Task 3: Tích hợp bác sĩ và dữ liệu mẫu

**Files:**
- Modify: `apps/api/src/doctor/stubs/warehouse-stub.service.ts`
- Modify: `apps/api/src/doctor/doctor.module.ts`
- Modify: `apps/api/src/doctor/doctor.service.spec.ts`
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: dịch vụ ghi sổ xuất bệnh nhân của Task 2.
- Produces: hoàn tất khám tạo phiếu `POSTED` đúng một lần; seed nhà cung cấp/lô/chứng từ/cảnh báo.

- [ ] Viết test fail chứng minh hoàn tất khám không trừ kép và rollback khi thiếu tồn.
- [ ] Chạy test, xác nhận fail.
- [ ] Thay đường trừ tồn cũ bằng dịch vụ kho dùng chung và bổ sung seed idempotent.
- [ ] Chạy test bác sĩ, seed kiểm tra và backend suite.

### Task 4: Ba màn hình kho

**Files:**
- Create: `apps/web/src/features/warehouse/warehouse-api.ts`
- Create: `apps/web/src/features/warehouse/warehouse-layout.tsx`
- Create: `apps/web/src/features/warehouse/warehouse-overview-page.tsx`
- Create: `apps/web/src/features/warehouse/warehouse-details-page.tsx`
- Create: `apps/web/src/features/warehouse/warehouse-transactions-page.tsx`
- Create: `apps/web/src/features/warehouse/warehouse-pages.test.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: REST API Task 2.
- Produces: `/warehouse`, `/warehouse/details`, `/warehouse/transactions` với loading/empty/error, form nhập/xuất và thao tác in/ghi sổ.

- [ ] Viết test fail cho ba tab, guard role, dữ liệu dashboard và form cơ bản.
- [ ] Chạy test frontend, xác nhận fail.
- [ ] Cài client/layout/pages và route lồng; dùng style hiện có, Tailwind và Lucide.
- [ ] Chạy test frontend và build.

### Task 5: In phiếu, tài liệu và kiểm chứng

**Files:**
- Create: `apps/web/src/features/warehouse/warehouse-print-view.tsx`
- Create: `TestWarehouse.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: dữ liệu phiếu và print log từ Tasks 2–4.
- Produces: bản in trình duyệt/PDF có `BẢN SAO`, hướng dẫn chạy và ma trận test.

- [ ] Viết test fail cho nhãn bản sao và tổng tiền trên bản in.
- [ ] Cài print view/CSS in và nối nút in.
- [ ] Chạy format/typecheck/test/build toàn workspace.
- [ ] Ghi kết quả thực tế, migration và tài khoản thử vào `TestWarehouse.md`/README.
