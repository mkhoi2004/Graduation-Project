# Báo Cáo Triển Khai Phân Hệ Bác Sĩ (/doctor)

Tài liệu này tổng hợp thiết kế kiến trúc database, API backend, stubs kho/kế toán, giao diện frontend và kiểm thử tự động cho phân hệ Bác sĩ theo đặc tả trong file `Role Bác Sĩ.md`.

---

## 1. Database Schema & Ràng buộc (Prisma + SQL Server)

Hệ cơ sở dữ liệu đã được bổ sung các bảng nghiệp vụ và các bảng `*Deleted` tương ứng (đồng bộ với quy ước sao lưu của phân hệ Tiếp nhận):

### 1.1. Các bảng nghiệp vụ chính:
1. **`DoctorExamination` (Phiếu khám bệnh của Bác sĩ):**
   - Mã phiếu: `PKB{YYYYDDMM}/{0001}`.
   - Quan hệ chặt chẽ: `intakeId` (FK Intake), `patientId` (FK Patient), `doctorId` (FK User), `roomId` (FK ClinicRoom).
   - Ràng buộc: `status` enum (`IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `isLocked` (khóa sau khi Ghi sổ / Ngừng khám), `startedAt`, `completedAt`, `cancelReason`.
2. **`MedicalSupply` (Danh mục Vật tư Y tế tiêu hao):**
   - `group`: Phân nhóm `THUONG` (VTYT thông thường) hoặc `VO_CAM` (VTYT vô cảm/gây tê).
   - Đơn vị cơ bản (`baseUnit`) & Đơn vị quy đổi (`conversionUnit`, `conversionRate`).
   - Tồn kho khả dụng (`inStock`), đơn giá vốn nội bộ (`costPrice` - bảo mật, không trả về UI bác sĩ).
   - Đã seed đủ **10 loại vật tư mẫu** theo `Role Bác Sĩ.md` (5 thường, 5 vô cảm).
3. **`ExaminationSupply` (Dòng VTYT sử dụng):**
   - `quantityInBaseUnit`: Số lượng theo đơn vị cơ bản (**CHECK > 0**).
   - `conversionUnitUsed`: Đơn vị quy đổi bác sĩ đã chọn lúc nhập.
   - `costPriceSnapshot`: Giá vốn tại thời điểm sử dụng để tính giá vốn kế toán.
4. **`SupplyReservation` (Giữ chỗ tồn kho):**
   - Trạng thái: `RESERVED` (giữ chỗ khi chọn) -> `DEDUCTED` (trừ kho khi Ghi sổ) -> `RELEASED` (hoàn tồn khi hủy).
5. **`ExaminationResult` (Kết quả tổng kết lâm sàng):**
   - `summary`: Tóm tắt kết quả khám.
   - `treatmentMethod`: Phương pháp điều trị.
   - `treatmentOrientation`: Hướng điều trị tiếp theo & dặn dò.
   - `nextAppointmentDate`: Ngày hẹn tái khám.
6. **`ExaminationPrintHistory` (Lịch sử in phiếu kết quả):**
   - `printedAt`: Thời điểm in.
   - `printedById`: Bác sĩ in.
   - `contentSnapshot`: Bản chụp JSON hồ sơ tại thời điểm in.
7. **`AccountingOutbox` (Hàng đợi bút toán sang /accounting):**
   - `serviceRevenue`: Doanh thu dịch vụ (Khi Hoàn thành = tổng tiền dịch vụ; Khi Ngừng khám = 0).
   - `supplyCost`: Giá vốn VTYT tiêu hao nội bộ.
   - `status`: `PENDING` -> `SENT`.
8. **`ExaminationAuditLog` (Nhật ký kiểm toán mở khóa sau Ghi sổ):**
   - Ghi lại `actorId`, `action` ('UNLOCK'), `reason`, `changesJson`.

### 1.2. Các bảng sao lưu dữ liệu đã xóa (`*Deleted`):
- `DoctorExaminationDeleted`
- `MedicalSupplyDeleted`
- `ExaminationSupplyDeleted`
- `SupplyReservationDeleted`
- `ExaminationResultDeleted`
- `ExaminationPrintHistoryDeleted`
- `AccountingOutboxDeleted`
- `ExaminationAuditLogDeleted`

---

## 2. Dịch vụ Stub cho Kho (/warehouse) & Kế toán (/accounting)

Đã thiết lập sẵn 2 service stub chuẩn interface tại backend:

### 2.1. `WarehouseServiceStub` (`apps/api/src/doctor/stubs/warehouse-stub.service.ts`):
- `checkStock(supplyCode, quantityInBaseUnit): Promise<{ available: boolean; currentStock: number }>`
- `reserveStock(examinationId, supplyCode, quantityInBaseUnit): Promise<{ reservationId: number; success: boolean }>`
- `deductStock(examinationId): Promise<{ success: boolean; deductedItemsCount: number }>`
- `releaseStock(examinationId): Promise<{ success: boolean }>`

### 2.2. `AccountingServiceStub` (`apps/api/src/doctor/stubs/accounting-stub.service.ts`):
- `enqueueJournalEntry(payload: { examinationId, examinationCode, serviceRevenue, supplyCost, isCancelled }): Promise<AccountingOutbox>`
  - Hợp đồng: Khi khám hoàn thành: `serviceRevenue = tổng dịch vụ quầy tiếp nhận`, `supplyCost = tổng giá vốn VTYT`.
  - Khi ngừng khám: `serviceRevenue = 0`, `supplyCost = tổng giá vốn VTYT đã dùng`.

---

## 3. Danh sách API Endpoint Backend (`/api/doctor`)

Tất cả các endpoint đều được bảo vệ bởi `DoctorAccessGuard` (yêu cầu vai trò `DOCTOR` hoặc `ADMIN`):

| Phương thức | Đường dẫn | Chức năng |
|-------------|-----------|-----------|
| `GET` | `/api/doctor/rooms` | Lấy danh sách phòng khám hoạt động |
| `GET` | `/api/doctor/queue?roomCode=...` | Lấy hàng đợi bệnh nhân trạng thái Tiếp nhận (sắp xếp: Khẩn cấp > Ưu tiên > Thường) |
| `GET` | `/api/doctor/current` | Lấy ca khám đang diễn ra của bác sĩ |
| `POST` | `/api/doctor/call-next` | Gọi STT tiếp theo (Chặn nếu đang có ca `IN_PROGRESS`) |
| `GET` | `/api/doctor/supplies` | Lấy danh mục 10 VTYT mẫu (**không trả về giá vốn**) |
| `GET` | `/api/doctor/examinations/:id` | Xem chi tiết hồ sơ ca khám |
| `PUT` | `/api/doctor/examinations/:id/supplies` | Cập nhật VTYT tiêu hao, kiểm tra tồn kho & giữ chỗ |
| `PUT` | `/api/doctor/examinations/:id/result` | Cập nhật 4 trường kết quả lâm sàng & hẹn tái khám |
| `POST` | `/api/doctor/examinations/:id/print` | Ghi nhận lịch sử in phiếu kết quả tổng kết |
| `POST` | `/api/doctor/examinations/:id/complete` | Ghi sổ Hoàn thành (trừ kho, đẩy bút toán outbox, khóa hồ sơ) |
| `POST` | `/api/doctor/examinations/:id/cancel` | Từ chối / Ngừng khám (bắt buộc lý do, revenue = 0, khóa hồ sơ) |
| `POST` | `/api/doctor/examinations/:id/unlock` | Mở khóa hồ sơ dành cho Admin / Trưởng khoa kèm lý do |
| `GET` | `/api/doctor/backup/deleted` | Tra cứu sao lưu các bản ghi đã xóa của bác sĩ |

---

## 4. Giao diện Frontend (/doctor)

- **Phong cách & Chủ đề:** Thiết kế đồng nhất hoàn toàn với phân hệ `/reception` (Tone màu tím chủ đạo `#5546e8`, font chữ, padding, bo góc `rounded-2xl`, layout bảng, form, modal).
- **Quy trình 4 Bước:**
  1. **Bước 1 - Hàng đợi tiếp nhận:** Hiển thị hàng đợi bệnh nhân có lọc tìm kiếm, thông tin mức ưu tiên, triệu chứng, dịch vụ tiếp nhận, nút **Gọi STT tiếp theo** (tự động khóa khi đang có ca khám dở).
  2. **Bước 2 - Vật tư y tế (VTYT):** Phân chia 2 tab rõ ràng: VTYT thông thường & VTYT vô cảm. Hỗ trợ chọn đơn vị quy đổi (Hộp) trước hoặc nhập đơn vị cơ bản (Kim/Cái/Ống). Tự động kiểm tra tồn khả dụng. **Tuyệt đối không hiển thị giá vốn**.
  3. **Bước 3 - Tóm tắt kết quả:** Form 4 trường: Tóm tắt kết quả, Phương pháp điều trị, Hướng điều trị tiếp theo, Ngày hẹn tái khám. Nút **In Phiếu Kết quả tổng kết** tự động tải file Excel và lưu vết lịch sử in.
  4. **Bước 4 - Ghi sổ & Hoàn thành:** Tổng hợp toàn diện hồ sơ khám bệnh, nút **Ghi sổ (Hoàn thành)** khóa toàn bộ dữ liệu chỉ đọc. Hỗ trợ modal Mở khóa cho tài khoản Quản trị viên kèm lý do.
- **Nút "Từ chối / Ngừng khám" toàn cục:** Nằm ở thanh header trên cùng, khả dụng tại mọi bước khi có ca khám đang diễn ra. Bắt buộc nhập lý do chi tiết và hiển thị cảnh báo quy tắc tài chính kế toán.

---

## 5. Mẫu Phiếu Kết Quả Excel (`phieu-ket-qua-tong-ket-template.xlsx`)

- Tái sử dụng cấu trúc XML và logo của mẫu in quầy tiếp nhận.
- Đổi tiêu đề thành **"Kết Quả Khám & Điều Trị"**.
- Thay thế các cột Đơn giá / Thành tiền / Tổng cộng bằng:
  - Danh mục dịch vụ đã thực hiện.
  - Tóm tắt kết quả khám lâm sàng & cận lâm sàng.
  - Phương pháp điều trị đã thực hiện.
  - Hướng điều trị tiếp theo & Lời dặn.
  - Ngày hẹn tái khám.
  - Bác sĩ khám ký tên.

---

## 6. Kết Quả Kiểm Thử (100% Pass)

### Backend (apps/api):
- `apps/api/src/doctor/doctor.service.spec.ts`: **10/10 tests passed**.
  - Kiểm tra thứ tự ưu tiên hàng đợi (Khẩn cấp > Ưu tiên > Thường).
  - Kiểm tra chặn gọi bệnh nhân khi đang có ca `IN_PROGRESS`.
  - Kiểm tra bảo mật không trả về `costPrice` cho bác sĩ.
  - Kiểm tra kiểm soát tồn kho và số lượng > 0.
  - Kiểm tra Ghi sổ (hoàn thành) và trừ kho, đẩy outbox doanh thu + chi phí.
  - Kiểm tra Ngừng khám bắt buộc có lý do và ghi nhận doanh thu = 0.
  - Kiểm tra mở khóa và lưu vết nhật ký kiểm toán.
- Toàn bộ backend test: **38/38 tests passed**.

### Frontend (apps/web):
- `apps/web/src/features/doctor/summary-excel.test.ts`: **3/3 tests passed** (xuất file Excel kết quả, format ngày tháng tiếng Việt, giữ logo & style gốc).
- `apps/web/src/App.test.tsx`: **6/6 tests passed** (bảo vệ route `/doctor`, điều hướng theo role).
- Toàn bộ frontend test: **38/38 tests passed**.

### Lint & Build:
- `oxlint`: **0 warnings, 0 errors** trên toàn bộ 92 files của `api` và `web`.
- `tsc -b && vite build`: **Pass cleanly**.
- `nest build`: **Pass cleanly**.
