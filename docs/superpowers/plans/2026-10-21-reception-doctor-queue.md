# Reception and Doctor Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung STT tự động theo phòng/ngày, hai mức ưu tiên `Thường | Ưu tiên`, in/hủy/làm lại tại `/reception`, và hàng chờ/gọi/vắng mặt an toàn đồng thời tại `/doctor`.

**Architecture:** Một `QueueTicket` bất biến gắn một-một với TNK lưu STT đã cấp; `RoomQueueCounter` khóa dãy số và STT đang gọi theo phòng/ngày. Backend NestJS là nguồn sự thật cho ngày nghiệp vụ, ca trực, cấp/gọi STT và audit; React chỉ gửi ý định và render dữ liệu backend.

**Tech Stack:** TypeScript 6, NestJS 12, Prisma 6.19, SQL Server, React 19, React Router 7, Vitest 4/5, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-21-reception-doctor-queue-design.md`

## Global Constraints

- Chỉ thay đổi hai phân hệ `/reception`, `/doctor`, schema/migration dùng chung, test, `test.md`, `Role Bác Sĩ.md`, `Role_nhan_vien_tiep_nhan.md`.
- Không sửa UI `/hr`, `/accounting`, `/warehouse`; chỉ đọc phân ca và tái sử dụng adapter hiện có từ backend hai phân hệ.
- STT là `0001`–`9999`, duy nhất theo `(businessDate, roomId, queueNumber)`, không tái sử dụng.
- Mức ưu tiên chỉ có `Thường | Ưu tiên`; không có `Cao`, `Khẩn cấp` trong type, DTO, seed, demo, UI hoặc test.
- `Ưu tiên` bắt buộc có lý do; ưu tiên không thay đổi thứ tự gọi.
- Ngày nghiệp vụ và reset dùng `Asia/Ho_Chi_Minh`; thời điểm audit dùng giờ máy chủ.
- Một TNK chỉ có một phòng, một bác sĩ, một STT; sau khi cấp STT khóa dịch vụ/phòng/bác sĩ/ưu tiên.
- Cấp và gọi STT dùng transaction Serializable, khóa SQL Server và unique constraints.
- Giữ nguyên, merge cẩn thận mọi thay đổi chưa commit của người dùng; không hoàn tác hoặc ghi đè các phần in, layout và role đã sửa sẵn.
- Dữ liệu test phải là dữ liệu giả.

## Review Focus

- Retry khi hai transaction cùng tạo counter đầu ngày: phải có test `Promise.all` chứng minh nhận `0001`, `0002`, không trùng.
- Mốc 00:00 Asia/Ho_Chi_Minh khi máy chủ chạy UTC: phải có test hai thời điểm hai phía của 23:59:59.
- Hai phiên cùng bấm Gọi/Vắng mặt: conditional update phải đảm bảo một ticket chỉ được gọi một lần.
- Phiếu legacy hoặc payload giả mạo có `Cao`/`Khẩn cấp`: backend phải từ chối sau migration, UI không render lựa chọn.
- Lỗi API khi in: không mở hộp thoại in và không tăng số lần in ở client; retry thành công mới xác định BẢN SAO.

---

### Task 1: Mô hình dữ liệu hàng chờ và thời gian phòng khám

**Files:**
- Create: `apps/api/src/common/clinic-time.ts`
- Create: `apps/api/src/common/clinic-time.spec.ts`
- Create: `apps/api/prisma/migrations/20261021090000_add_reception_doctor_queue/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Produces: `getClinicBusinessDate(now?: Date): string`, `getClinicTimeParts(now?: Date): { date: string; time: string }`, Prisma models `RoomQueueCounter`, `QueueTicket`, `QueueCallHistory`, `IntakePrintHistory`, `IntakeAuditLog`.
- Consumes: Existing `Intake`, `ClinicRoom`, `User`, `Employee`, `ShiftAssignment` models.

- [ ] **Step 1: Viết test thất bại cho múi giờ và reset ngày**

```ts
expect(getClinicBusinessDate(new Date('2026-10-20T16:59:59.000Z'))).toBe('2026-10-20')
expect(getClinicBusinessDate(new Date('2026-10-20T17:00:00.000Z'))).toBe('2026-10-21')
expect(getClinicTimeParts(new Date('2026-10-20T18:30:00.000Z'))).toEqual({ date: '2026-10-21', time: '01:30' })
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/api test -- src/common/clinic-time.spec.ts`
Expected: FAIL vì module `clinic-time` chưa tồn tại.

- [ ] **Step 3: Tạo helper thời gian và Prisma models**

Implement:

```ts
export function getClinicBusinessDate(now: Date = new Date()): string
export function getClinicTimeParts(now: Date = new Date()): { date: string; time: string }
export function clinicDateToDbDate(date: string): Date
```

Schema phải có unique `RoomQueueCounter(businessDate, roomId)`, unique `QueueTicket.intakeId`, unique ticket `(businessDate, roomId, queueNumber)`, cùng các quan hệ audit/in/lịch sử gọi trong spec.

- [ ] **Step 4: Viết migration SQL**

Migration phải:

- Tạo bảng/index/FK mới và check `queueNumber BETWEEN 1 AND 9999`.
- Thêm `priorityReason`, `roomOverrideReason` vào `Intake`.
- Chuẩn hóa mọi priority ngoài `Thường`, `Ưu tiên` thành `Thường`, sau đó thêm check constraint chỉ cho hai giá trị.
- Backfill ticket cho TNK `TRANSFERRED`/`IN_PROGRESS` trong ngày migration theo phòng và thời gian tăng dần; counter lấy số lớn nhất; `IN_PROGRESS` thành ticket `CALLED`.
- Không tạo ticket cho hồ sơ lịch sử đã kết thúc.

- [ ] **Step 5: Sửa seed/demo backend chỉ còn hai mức ưu tiên**

Assert bằng tìm kiếm: `rg -n "Cao|Khẩn cấp" apps/api/prisma apps/api/src/reception apps/api/src/doctor` không còn kết quả nghiệp vụ hợp lệ.

- [ ] **Step 6: Sinh Prisma client và chạy test**

Run: `npm --prefix apps/api run prisma:generate`
Expected: Prisma Client generated successfully.

Run: `npm --prefix apps/api test -- src/common/clinic-time.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit theo phạm vi**

```bash
git add apps/api/prisma apps/api/src/common
git commit -m "feat: add clinic queue data model"
```

---

### Task 2: Cấp STT nguyên tử và dữ liệu bác sĩ đang trực tại `/reception`

**Files:**
- Create: `apps/api/src/reception/reception-queue.service.ts`
- Create: `apps/api/src/reception/reception-queue.service.spec.ts`
- Modify: `apps/api/src/reception/reception.module.ts`
- Modify: `apps/api/src/reception/reception.service.ts`
- Modify: `apps/api/src/reception/reception.service.spec.ts`
- Modify: `apps/api/src/reception/dto/intake.dto.ts`

**Interfaces:**
- Consumes: Task 1 models/helpers.
- Produces: `ReceptionQueueService.issueTicket(input, actorId?)`, `ReceptionService.getMasterData(now?)`, updated `ReceptionService.updateIntakeServices(code, dto, actorId?)`.

- [ ] **Step 1: Viết test thất bại cho cấp STT**

```ts
expect(await issue('room-01', 'TNK-A')).toMatchObject({ queueNumber: 1, displayNumber: '0001' })
expect(await issue('room-01', 'TNK-B')).toMatchObject({ queueNumber: 2, displayNumber: '0002' })
expect(await issue('room-02', 'TNK-C')).toMatchObject({ queueNumber: 1, displayNumber: '0001' })
expect(await issue('room-01', 'TNK-A')).toMatchObject({ queueNumber: 1 })
```

Thêm test counter `9999` ném `BadRequestException`, hai lệnh `Promise.all` cùng phòng nhận hai số khác nhau, và retry khi insert counter gặp Prisma `P2002`.

- [ ] **Step 2: Chạy test cấp STT để xác nhận thất bại**

Run: `npm --prefix apps/api test -- src/reception/reception-queue.service.spec.ts`
Expected: FAIL vì service chưa tồn tại.

- [ ] **Step 3: Implement `ReceptionQueueService`**

```ts
type IssueTicketInput = {
  intakeId: number
  roomId: number
  businessDate: string
}

async issueTicket(input: IssueTicketInput, actorId?: number): Promise<QueueTicketDto>
```

Dùng Prisma interactive transaction isolation `Serializable`; khóa counter bằng SQL Server `UPDLOCK, HOLDLOCK`; kiểm tra ticket theo `intakeId` trước khi tăng; retry hữu hạn khi tạo counter xung đột.

- [ ] **Step 4: Viết test ca trực và validation priority**

```ts
expect(master.doctors[0]).toMatchObject({ isOnDuty: true, assignedRoom: { id: 'room-01' } })
await expect(save({ priority: 'Ưu tiên', priorityReason: '' })).rejects.toThrow('lý do')
await expect(save({ priority: 'Cao' as never })).rejects.toThrow()
await expect(saveOffShift({ roomOverrideReason: '' })).rejects.toThrow('lý do')
```

Thêm test ca đang bao phủ giờ hiện tại, ca chồng chọn `startTime` muộn nhất, ngoài ca dùng fallback room và yêu cầu lý do.

- [ ] **Step 5: Cập nhật DTO và `getMasterData`**

`UpdateIntakeServicesDto` thêm `priority`, `priorityReason`, `roomOverrideReason`; `priority` dùng `@IsIn(['Thường', 'Ưu tiên'])`. `getMasterData` join `User.employee.shiftAssignments.shift.room`, trả `businessDate`, `isOnDuty`, `assignedRoom`, `fallbackRoom`, thông tin ca.

- [ ] **Step 6: Gộp lưu dịch vụ và cấp STT trong một transaction**

`updateIntakeServices` phải xác thực đủ dữ liệu, từ chối nếu đã có ticket với payload khác, tạo dịch vụ/phòng/bác sĩ/priority và ticket/audit nguyên tử, trả `queueNumber: '0001'`. Controller truyền `req.user.sub`.

- [ ] **Step 7: Chạy test reception backend**

Run: `npm --prefix apps/api test -- src/reception/reception-queue.service.spec.ts src/reception/reception.service.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit theo phạm vi**

```bash
git add apps/api/src/reception
git commit -m "feat: issue reception queue tickets atomically"
```

---

### Task 3: API danh sách, in, hủy và làm lại tại `/reception`

**Files:**
- Modify: `apps/api/src/reception/reception.controller.ts`
- Modify: `apps/api/src/reception/reception.service.ts`
- Modify: `apps/api/src/reception/reception.service.spec.ts`
- Create: `apps/api/src/reception/dto/queue-actions.dto.ts`

**Interfaces:**
- Consumes: `QueueTicketDto` và models Task 1/2.
- Produces: filtered `getIntakes(filters)`, `recordIntakePrint(code, actorId)`, `cancelIntake(code, reason, actorId)`.

- [ ] **Step 1: Viết test thất bại cho danh sách và STT đang gọi**

```ts
expect(result[0]).toMatchObject({
  queueNumber: '0005',
  priority: 'Ưu tiên',
  priorityReason: 'Người cao tuổi',
  currentCallingNumber: '0003',
})
```

Test filter ngày/phòng/priority và định dạng 4 chữ số.

- [ ] **Step 2: Viết test thất bại cho in/in lại**

```ts
expect(first).toMatchObject({ isCopy: false, printCount: 1, queueNumber: '0005' })
expect(second).toMatchObject({ isCopy: true, printCount: 2, queueNumber: '0005' })
expect(second.queueNumber).toBe(first.queueNumber)
```

- [ ] **Step 3: Viết test thất bại cho hủy/làm lại**

Assert: lý do trống bị chặn; `WAITING` được chuyển `CANCELLED`; ticket không bị xóa; ticket `CALLED` hoặc có examination bị chặn; phiếu đã thu giữ payment và tạo `AccountingEvent` idempotent với doanh thu/giá vốn/thưởng 0, trạng thái thu trước chờ xử lý.

- [ ] **Step 4: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/api test -- src/reception/reception.service.spec.ts`
Expected: FAIL ở các method/field mới.

- [ ] **Step 5: Implement API**

Routes:

```text
GET  /reception/intakes?date=YYYY-MM-DD&roomCode=...&priority=...
POST /reception/intakes/:code/print
POST /reception/intakes/:code/cancel  { reason: string }
```

In luôn snapshot ticket cũ; cancel dùng conditional update `WAITING -> CANCELLED`, audit đầy đủ và event kế toán idempotent khi có thu trước.

- [ ] **Step 6: Chạy test backend reception**

Run: `npm --prefix apps/api test -- src/reception/reception.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit theo phạm vi**

```bash
git add apps/api/src/reception
git commit -m "feat: add reception queue print and cancellation APIs"
```

---

### Task 4: Giao diện tạo tiếp nhận và khóa sau cấp STT

**Files:**
- Modify: `apps/web/src/features/reception/reception-data.ts`
- Modify: `apps/web/src/features/reception/reception-api.ts`
- Modify: `apps/web/src/features/reception/reception-context.tsx`
- Modify: `apps/web/src/features/reception/new-intake-page.tsx`
- Modify: `apps/web/src/features/reception/services-page.tsx`
- Modify: `apps/web/src/features/reception/reception-data.test.ts`
- Modify: `apps/web/src/features/reception/reception-context.test.ts`
- Modify: `apps/web/src/features/reception/reception-pages.test.tsx`

**Interfaces:**
- Consumes: Task 2 master-data/save response.
- Produces: `Priority = 'Thường' | 'Ưu tiên'`, Intake ticket fields, form ca trực/phòng read-only, locked editor state.

- [ ] **Step 1: Viết test thất bại cho đúng hai mức ưu tiên**

```tsx
expect(screen.getByRole('option', { name: 'Thường' })).toBeInTheDocument()
expect(screen.getByRole('option', { name: 'Ưu tiên' })).toBeInTheDocument()
expect(screen.queryByText(/Cao|Khẩn cấp/)).not.toBeInTheDocument()
```

Test chọn `Ưu tiên` hiện ô lý do và chặn lưu khi trống.

- [ ] **Step 2: Viết test thất bại cho ca trực/phòng**

Assert chọn bác sĩ đang trực tự điền phòng read-only; chọn bác sĩ ngoài ca hiện cảnh báo, cho chọn phòng và bắt buộc lý do; response có STT hiển thị ngay.

- [ ] **Step 3: Viết test thất bại cho khóa dịch vụ**

Sau response có `queueNumber`, các nút tăng/giảm dịch vụ và select bác sĩ bị disable; bấm lưu lại không gửi payload thay đổi.

- [ ] **Step 4: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/web test -- src/features/reception/reception-data.test.ts src/features/reception/reception-context.test.ts src/features/reception/reception-pages.test.tsx`
Expected: FAIL ở type/UI mới.

- [ ] **Step 5: Cập nhật model/API/context**

Thêm các field `queueNumber`, `queueDate`, `queueStatus`, `priorityReason`, `roomOverrideReason`, `doctorName`, `roomName`, `printCount`, `isCopy`; bỏ mọi union `Cao`/`Khẩn cấp`. `enhancedDispatch` phải await/merge response backend cho hành động lưu thay vì optimistic local STT.

- [ ] **Step 6: Cập nhật hai form**

`NewIntakePage` chỉ có hai lựa chọn. `ServicesPage` dùng master data backend, tự điền phòng ca trực, hiển thị override form khi cần, và khóa toàn bộ vùng điều phối/dịch vụ sau cấp STT.

- [ ] **Step 7: Chạy test frontend reception**

Run: `npm --prefix apps/web test -- src/features/reception/reception-data.test.ts src/features/reception/reception-context.test.ts src/features/reception/reception-pages.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit theo phạm vi**

```bash
git add apps/web/src/features/reception
git commit -m "feat: add reception priority and queue assignment UI"
```

---

### Task 5: Tab Phiếu tiếp nhận, lọc, STT đang gọi và bản in

**Files:**
- Modify: `apps/web/src/features/reception/receipt-page.tsx`
- Modify: `apps/web/src/features/reception/reception-print-view.tsx`
- Modify: `apps/web/src/features/reception/receipt-excel.ts`
- Modify: `apps/web/src/features/reception/reception-api.ts`
- Modify: `apps/web/src/features/reception/reception-pages.test.tsx`
- Modify: `apps/web/src/features/reception/receipt-excel.test.ts`

**Interfaces:**
- Consumes: Task 3 filtered list/print/cancel APIs and Task 4 Intake type.
- Produces: danh sách Phiếu tiếp nhận, bộ lọc, modal in có STT, hủy/làm lại.

- [ ] **Step 1: Viết test thất bại cho danh sách và bộ lọc**

Assert các cột `STT`, `Mức ưu tiên`, `Phòng khám`, `Bác sĩ`, `Trạng thái`; filter phòng/ngày/priority gửi đúng query; banner phòng hiển thị `STT đang gọi: 0003`.

- [ ] **Step 2: Viết test thất bại cho phiếu in và BẢN SAO**

```tsx
expect(screen.getByText('0005')).toHaveClass(expect.stringContaining('text-'))
expect(screen.getByText('Mức ưu tiên: Ưu tiên')).toBeInTheDocument()
expect(screen.getByText('Người cao tuổi')).toBeInTheDocument()
expect(screen.getByText('BẢN SAO')).toBeInTheDocument()
```

Test API print lỗi thì `triggerPrint` không được gọi; lần in thứ hai dùng `isCopy` từ server.

- [ ] **Step 3: Viết test thất bại cho hủy/làm lại**

Assert modal bắt buộc lý do, hủy cập nhật `Đã hủy`, nút Làm lại điều hướng tới TNK mới với query bệnh nhân cũ, và phiếu đã gọi không có nút hủy.

- [ ] **Step 4: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/web test -- src/features/reception/reception-pages.test.tsx src/features/reception/receipt-excel.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implement danh sách và in**

Giữ các chỉnh sửa A5/print hiện có; chỉ merge vùng STT lớn, priority/lý do, metadata backend và BẢN SAO. Excel cũng dùng ticket cũ, không sinh STT.

- [ ] **Step 6: Implement hủy/làm lại**

Hủy gọi API rồi refresh; Làm lại chỉ preselect bệnh nhân, không sao chép STT.

- [ ] **Step 7: Chạy test frontend reception**

Run: `npm --prefix apps/web test -- src/features/reception/reception-pages.test.tsx src/features/reception/receipt-excel.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit theo phạm vi**

```bash
git add apps/web/src/features/reception
git commit -m "feat: show and print reception queue tickets"
```

---

### Task 6: Backend hàng chờ và gọi STT nguyên tử tại `/doctor`

**Files:**
- Create: `apps/api/src/doctor/doctor-queue.service.ts`
- Create: `apps/api/src/doctor/doctor-queue.service.spec.ts`
- Modify: `apps/api/src/doctor/doctor.module.ts`
- Modify: `apps/api/src/doctor/doctor.service.ts`
- Modify: `apps/api/src/doctor/doctor.service.spec.ts`
- Modify: `apps/api/src/doctor/doctor.controller.ts`
- Modify: `apps/api/src/doctor/dto/doctor.dto.ts`

**Interfaces:**
- Consumes: Task 1 ticket/counter/history models.
- Produces: `DoctorQueueService.getQueue`, `DoctorQueueService.callNext`, `DoctorService.callNextPatient` facade.

- [ ] **Step 1: Viết test thất bại cho hàng chờ thuần STT**

```ts
expect(queue.map((item) => item.queueNumber)).toEqual(['0001', '0002', '0003'])
expect(queue[2]).toMatchObject({ priority: 'Ưu tiên', priorityReason: 'Người cao tuổi' })
expect(summary).toMatchObject({ waitingCount: 3, priorityWaitingCount: 1 })
```

Input phải chứa bệnh nhân ưu tiên ở cuối để chứng minh không sort theo priority.

- [ ] **Step 2: Viết test thất bại cho gọi nguyên tử**

Assert ticket nhỏ nhất đúng `doctorId`/room được gọi; doctor khác không gọi được; đang có `IN_PROGRESS` bị chặn; không còn chờ trả `nextExamination: null` và message chính xác; hai `Promise.all` không tạo hai examination cho cùng intake.

- [ ] **Step 3: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/api test -- src/doctor/doctor-queue.service.spec.ts src/doctor/doctor.service.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement query hàng chờ**

Chỉ lấy businessDate hôm nay, ticket `WAITING`, `Intake.status = TRANSFERRED`, `Intake.doctorId = actor`; order `queueNumber asc`. Room lấy từ ca trực/TNK, không tin room tùy ý từ client.

- [ ] **Step 5: Implement gọi STT**

Transaction Serializable khóa counter phòng, kiểm tra ca đang khám, chọn ticket nhỏ nhất, conditional update `WAITING -> CALLED`, tạo `DoctorExamination`, update Intake, `QueueCallHistory`, `IntakeAuditLog`, và `currentTicketId/currentNumber`.

`POST /doctor/call-next` không cần `roomCode` từ client; DTO rỗng hoặc route suy phòng từ backend.

- [ ] **Step 6: Chạy test backend doctor queue**

Run: `npm --prefix apps/api test -- src/doctor/doctor-queue.service.spec.ts src/doctor/doctor.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit theo phạm vi**

```bash
git add apps/api/src/doctor
git commit -m "feat: call doctor queue tickets atomically"
```

---

### Task 7: Backend Vắng mặt và tự gọi tiếp

**Files:**
- Modify: `apps/api/src/doctor/doctor-queue.service.ts`
- Modify: `apps/api/src/doctor/doctor-queue.service.spec.ts`
- Modify: `apps/api/src/doctor/doctor.service.ts`
- Modify: `apps/api/src/doctor/doctor.service.spec.ts`
- Modify: `apps/api/src/doctor/doctor.controller.ts`
- Modify: `apps/api/src/doctor/dto/doctor.dto.ts`

**Interfaces:**
- Consumes: `DoctorQueueService.callNext` Task 6 và existing `AccountingServiceStub.enqueueJournalEntry`.
- Produces: `markAbsent(examinationId, doctorId): Promise<{ absentExamination; nextExamination; message }>`.

- [ ] **Step 1: Viết test thất bại cho điều kiện Vắng mặt**

Assert ca thuộc bác sĩ khác bị chặn; ca không `IN_PROGRESS` bị chặn; có supply/reservation/result/print history bị chặn với thông báo dùng Ngừng khám.

- [ ] **Step 2: Viết test thất bại cho trạng thái và tài chính**

```ts
expect(absent.status).toBe('ABSENT')
expect(ticket.status).toBe('ABSENT')
expect(accounting.enqueueJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
  serviceRevenue: 0,
  supplyCost: 0,
  isCancelled: true,
}))
```

Assert không gọi kho, không tạo thưởng, STT cũ không quay lại WAITING.

- [ ] **Step 3: Viết test thất bại cho tự gọi tiếp**

Assert cùng hành động chọn ticket nhỏ nhất tiếp theo, tạo examination mới, cập nhật `currentNumber`; nếu hết hàng thì clear current counter và trả message `Không còn bệnh nhân chờ`.

- [ ] **Step 4: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/api test -- src/doctor/doctor-queue.service.spec.ts src/doctor/doctor.service.spec.ts`
Expected: FAIL.

- [ ] **Step 5: Implement endpoint Vắng mặt**

Route: `POST /doctor/examinations/:id/absent`. Actor bắt buộc từ guard. Transaction cập nhật exam/intake/ticket/audit/history rồi gọi primitive `callNext` dùng chung; adapter kế toán nhận sự kiện kết thúc 0/0.

- [ ] **Step 6: Chạy test backend doctor**

Run: `npm --prefix apps/api test -- src/doctor/doctor-queue.service.spec.ts src/doctor/doctor.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit theo phạm vi**

```bash
git add apps/api/src/doctor
git commit -m "feat: handle absent patients and auto-call next"
```

---

### Task 8: Giao diện hàng chờ, STT đang khám và Vắng mặt tại `/doctor`

**Files:**
- Modify: `apps/web/src/features/doctor/doctor-types.ts`
- Modify: `apps/web/src/features/doctor/doctor-api.ts`
- Modify: `apps/web/src/features/doctor/doctor-context.tsx`
- Modify: `apps/web/src/features/doctor/doctor-layout.tsx`
- Modify: `apps/web/src/features/doctor/steps/queue-step.tsx`
- Create: `apps/web/src/features/doctor/components/absent-modal.tsx`
- Modify: `apps/web/src/features/doctor/doctor-steps.test.tsx`

**Interfaces:**
- Consumes: Task 6/7 doctor responses.
- Produces: queue summary UI, `markAbsentApi`, modal xác nhận và transition tự gọi tiếp.

- [ ] **Step 1: Viết test thất bại cho hàng chờ**

Assert `0001`, `0002`, `0003` theo đúng thứ tự; priority ở `0003` có nền/nhãn và lý do nhưng không lên đầu; hiển thị `Có 1 bệnh nhân ưu tiên đang chờ`, `STT đang khám`, `3 người đang chờ`.

- [ ] **Step 2: Viết test thất bại cho phòng bác sĩ**

Assert select đổi phòng hiện tại bị loại bỏ/disabled; UI chỉ hiển thị phòng backend xác định; call API không gửi roomCode giả mạo.

- [ ] **Step 3: Viết test thất bại cho Vắng mặt**

Assert nút Vắng mặt hiện với ca chưa có dữ liệu; modal xác nhận; API trả next exam thì context chuyển sang exam mới; trả null thì về Step 1 và hiện `Không còn bệnh nhân chờ`; lỗi dữ liệu khám hiện thông báo dùng Ngừng khám.

- [ ] **Step 4: Chạy test để xác nhận thất bại**

Run: `npm --prefix apps/web test -- src/features/doctor/doctor-steps.test.tsx`
Expected: FAIL.

- [ ] **Step 5: Cập nhật type/API/context**

`QueuePatient.queueNumber: string`, `priority: 'Thường' | 'Ưu tiên'`, `priorityReason?: string`, summary counts/current number. `ExaminationDetail.status` thêm `ABSENT`. Implement `markAbsentApi(id)`.

- [ ] **Step 6: Cập nhật Step 1 và modal**

Copy UI chính xác: `Gọi STT tiếp theo`, `Có N bệnh nhân ưu tiên đang chờ`, `Không còn bệnh nhân chờ`, `Vắng mặt`. Không thêm nút gọi riêng từng bệnh nhân.

- [ ] **Step 7: Chạy test frontend doctor**

Run: `npm --prefix apps/web test -- src/features/doctor/doctor-steps.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit theo phạm vi**

```bash
git add apps/web/src/features/doctor
git commit -m "feat: add doctor queue and absent workflow UI"
```

---

### Task 9: Test đồng thời với database, tài liệu role và báo cáo kiểm thử

**Files:**
- Create: `apps/api/test/queue-concurrency.e2e-spec.ts`
- Modify: `Role Bác Sĩ.md`
- Modify: `Role_nhan_vien_tiep_nhan.md`
- Modify: `test.md`

**Interfaces:**
- Consumes: Toàn bộ Task 1–8.
- Produces: bằng chứng test thật, tài liệu nghiệp vụ đồng bộ.

- [ ] **Step 1: Viết e2e test đồng thời trên SQL Server test database**

Test tạo dữ liệu giả và `Promise.all` cho hai lần cấp cùng phòng, hai lần gọi; assert unique ticket và đúng thứ tự. Test ngày/phòng độc lập, idempotency TNK, giới hạn 9999 và unique DB constraint.

- [ ] **Step 2: Chạy migration trên database test**

Run: `npm --prefix apps/api run prisma:migrate`
Expected: migration thành công và check/unique constraints tồn tại. Nếu môi trường không có SQL Server test an toàn, không dùng DB thật và ghi `Not tested` rõ lý do trong `test.md`.

- [ ] **Step 3: Chạy e2e concurrency**

Run: `npm --prefix apps/api run test:e2e -- queue-concurrency.e2e-spec.ts`
Expected: PASS; nếu không có database test thì ghi `Not tested`, không ghi PASS.

- [ ] **Step 4: Chạy toàn bộ backend/frontend tests và builds**

Run: `npm --prefix apps/api test`
Expected: tất cả test PASS.

Run: `npm --prefix apps/api run build`
Expected: exit 0.

Run: `npm --prefix apps/web test`
Expected: tất cả test PASS.

Run: `npm --prefix apps/web run build`
Expected: exit 0.

- [ ] **Step 5: Kiểm tra không còn mức ưu tiên bị loại bỏ**

Run: `rg -n "Cao|Khẩn cấp" apps/api/src/reception apps/api/src/doctor apps/web/src/features/reception apps/web/src/features/doctor apps/api/prisma/seed.ts`
Expected: không có kết quả nghiệp vụ; nếu migration chứa chuỗi legacy để cleanup thì đó là ngoại lệ duy nhất.

- [ ] **Step 6: Cập nhật hai file role**

Merge vào nội dung hiện có:

- `Role_nhan_vien_tiep_nhan.md`: STT, đúng hai mức ưu tiên, ca trực/phòng tự điền, khóa sau cấp, in/BẢN SAO, hủy/làm lại.
- `Role Bác Sĩ.md`: Bước 1 thuần STT, priority chỉ hiển thị, current number/count, Vắng mặt và tự gọi tiếp.

- [ ] **Step 7: Cập nhật `test.md` bằng kết quả thật**

Thêm toàn bộ test case người dùng yêu cầu; chỉ ghi PASS khi lệnh/ca test đã chạy, còn lại ghi `Not tested` và lý do. Giữ nguyên báo cáo HR hiện có, thêm một phần mới cho hàng chờ `/reception`–`/doctor`.

- [ ] **Step 8: Tự review diff và phạm vi**

Run: `git diff --check`
Expected: không có whitespace errors.

Run: `git status --short`
Expected: chỉ các file trong phạm vi và các thay đổi người dùng đã có từ trước; không có chỉnh sửa ngoài ý muốn.

- [ ] **Step 9: Commit tài liệu và test**

```bash
git add apps/api/test 'Role Bác Sĩ.md' Role_nhan_vien_tiep_nhan.md test.md docs/superpowers
git commit -m "test: verify reception and doctor queue workflow"
```

## Self-review

- Spec coverage: Task 1–3 bao phủ counter, migration, in/hủy/audit; Task 4–5 bao phủ `/reception`; Task 6–8 bao phủ `/doctor`, gọi và Vắng mặt; Task 9 bao phủ test thật và tài liệu.
- Step scan: mỗi bước tạo một kết quả kiểm tra được; không để TBD.
- Type consistency: dùng thống nhất `queueNumber: string` ở API response/UI, `queueNumber: number` trong DB, `priority: 'Thường' | 'Ưu tiên'`.
- Review Focus: năm rủi ro đầu tài liệu đều có test sở hữu ở Task 1, 2, 5, 6, 7.
- Proportion: plan quyết định file/interface/test, không chép thân hàm triển khai.
