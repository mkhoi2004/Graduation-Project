# BÁO CÁO KIỂM THỬ VÀ TRẠNG THÁI HỆ THỐNG (TEST.MD)

Dự án: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR**  
Thời điểm kiểm tra: 14/10/2026 23:38:00 (GMT+7)  
Môi trường: Local Windows 10/11, SQL Server 2022 Express, Node.js v24.21.0, React 19 + Vite 7

> **Cập nhật mới nhất:** 15/10/2026 (GMT+7), working tree phát triển từ commit `d77248e600c4c70850eb9535b3ea03b168cf05c7`.  
> **Lưu ý về lịch sử:** số liệu **96/96 Pass** bên dưới là kết quả của lần chạy ngày 14/10/2026 và được giữ nguyên để bảo toàn lịch sử. Kết quả hiện tại, test case chi tiết, lỗi và rủi ro nằm tại **Mục 8**; kết luận “100% hoàn thành” cũ không còn được dùng làm kết luận hiện hành.

---

## 1. Tổng quan Trạng thái Hệ thống

| Thành phần | Công nghệ / Phiên bản | Cổng / Kết nối | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Cơ sở dữ liệu** | SQL Server 2022 Express | `localhost:1433` | **READY (Đạt)** | Database `[Graduation Project]`, 99 bảng, migration `001-full-schema` |
| **Backend API** | Node.js (ESM) + Express 5 | `127.0.0.1:5000` | **READY (Đạt)** | Health check: Liveness (200 OK), Readiness (200 OK) |
| **Frontend UI** | React 19 + Vite + Ant Design | `127.0.0.1:5173` | **READY (Đạt)** | Vite build thành công (3264 modules), bọc AuthProvider + Router |
| **Module 1** | Auth, RBAC & Audit Logs | REST API + React | **READY (Đạt)** | 5 Role chuẩn, cơ chế Maker-Checker với cờ `IsApprover`, Soft-Delete |
| **Module 2** | Danh mục & Bảng giá Phiên bản | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-16 và AT-21, Soft-Delete Rooms/Services |
| **Module 3** | Quản lý Hồ sơ Bệnh nhân | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-05 (Trùng SĐT), tiền sử & dị ứng |
| **Module 4** | Lịch hẹn & Lượt khám (Visits) | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-17 (Quan hệ điều trị), máy trạng thái lượt khám |
| **Module 5** | EMR, Sơ đồ răng, Đồng thuận, Đơn thuốc & Chốt dịch vụ | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-06, AT-13, AT-18, AT-23, sơ đồ răng FDI 32 răng |
| **Module 6** | Thanh toán, Thu ngân, Cọc & Công nợ | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-01, AT-02, AT-15, AT-20, ca thu ngân `CashShifts` |
| **Module 7** | Kho thuốc, Vật tư, FEFO & Serial Implant | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-07, AT-08, AT-12, Quản lý lô & Serial Implant |
| **Module 8** | Kế toán, Ca thu ngân, Khóa sổ kỳ & Sổ cái | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-09, AT-10, Maker-Checker Kế toán trưởng |
| **Module 9** | Bảo lãnh Bảo hiểm Thương mại (BHTM) | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-03, AT-04, AT-14, Chống gửi trùng, Quyết định xử lý thiếu |
| **Module 10** | Tiệt trùng, Labo & Bảo hành (AT-22) | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-22, Ngoại lệ cấp cứu, Chống tái dùng gói, Labo Rework, Bảo hành & Sự cố |
| **Module 11** | Hoa hồng & Bảng lương Nhân sự | REST API + React | **READY (Đạt)** | Một dòng tiền không tính hoa hồng 2 lần, Hoàn tiền tạo điều chỉnh số âm, Không sửa bảng lương đã khóa, Bác sĩ chỉ xem hoa hồng của mình |
| **Module 12** | Tài sản & Đối soát Cuối ngày | REST API + React | **READY (Đạt)** | Nghiệm thu AT-11 (Hoàn sau khóa sổ), AT-19 (Toàn vẹn chữ ký số & khóa ngoại), AT-24 (Báo cáo đối soát tổng hợp v14), Tự động phát hiện 5 nguồn bất thường |

---

## 2. Dữ liệu Thu thập sau Kiểm thử Tự động (Automated Test Suite)

Chạy lệnh: `npm test` trong thư mục `backend/`  
Kết quả: **96/96 tests ĐẠT (100% Pass) - 0 Failures - Toàn bộ 12/12 Module HOÀN THÀNH**  

```text
✔ liveness does not require SQL; readiness does query SQL (85.7ms)
✔ SQL failure is 503 without leaking SQL credentials or query (9.5ms)
✔ unknown API and invalid JSON have stable errors without stack traces (29.2ms)
✔ configuration parses false correctly and supports named instance or fixed port (6.8ms)

▶ Module 1 - Authentication & Authorization Integration Tests
  ✔ Admin login succeeds and returns JWT and role details (425.4ms)
  ✔ Receptionist login succeeds and returns RECEPTIONIST role (315.5ms)
  ✔ Login with wrong password fails with 401 without leaking internal details (307.2ms)
  ✔ Login with nonexistent user fails with 401 (31.0ms)
  ✔ GET /api/auth/me returns current user profile when authenticated (18.9ms)
  ✔ GET /api/auth/me rejects request without token with 401 (5.4ms)
  ✔ Admin can access GET /api/users (37.5ms)
  ✔ Receptionist is forbidden from accessing GET /api/users with 403 (21.7ms)
  ✔ Admin can view AccessAuditLogs with recorded actions (34.9ms)
✔ Module 1 - Authentication & Authorization Integration Tests (1653.2ms)

▶ Module 2 - Catalog & Versioned Configuration Integration Tests
  ✔ Receptionist can read services and see current active prices (69.2ms)
  ✔ Receptionist is forbidden from creating new services with 403 (22.8ms)
  ✔ Admin can create a new service with initial price version (71.5ms)
  ✔ Approver can approve a draft price version (Maker-Checker) (45.1ms)
  ✔ AT-21: Overlapping price versions cannot be approved simultaneously (34.9ms)
  ✔ Admin can soft-delete a service and archive it into Services_Deleted (81.1ms)
  ✔ Admin can restore a soft-deleted service (44.9ms)
  ✔ Authenticated staff can view system configuration versions (21.3ms)
✔ Module 2 - Catalog & Versioned Configuration Integration Tests (1875.4ms)

▶ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests
  ✔ Receptionist can create patient profile 1 with phone (41.4ms)
  ✔ AT-05: Creating patient 2 with same phone returns warning and requires confirmation (35.8ms)
  ✔ Receptionist can create visit and assign to Doctor (81.9ms)
  ✔ AT-17: Doctor can view patient profile when active treatment relationship exists (46.2ms)
  ✔ AT-17: Doctor CANNOT view patient 2 who has NO treatment relationship or assignment (26.2ms)
  ✔ Doctor can transition visit state to IN_PROGRESS and CLINICAL_COMPLETED (84.2ms)
  ✔ Patient with existing visits cannot be deleted (Business rule) (336.5ms)
✔ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests (1834.0ms)

▶ Module 5 - Clinical EMR, Consents (AT-06), SignQueue (AT-13), Service Completion (AT-18) & Immutability (AT-23)
  ✔ Setup: Login users and create test visit with doctor assignment (1509.3ms)
  ✔ EMR Draft creation and update (Chief complaint, Diagnoses, ToothChart) (296.4ms)
  ✔ AT-17: Doctor without treatment relationship is rejected with 403 (55.5ms)
  ✔ AT-13: Network loss simulation during signing pushes to SignQueue without fake signature (327.4ms)
  ✔ AT-23: EMR content cannot be modified directly once signed; Addenda required (264.85ms)
  ✔ AT-06: Consent Revocation stops planned procedures, keeps completed ones, never deletes EMR (1088.4ms)
  ✔ AT-18: Service Completion - prevent duplicate completion call to prevent double billing/stock consumption (308.1ms)
✔ Module 5 - Clinical EMR, Consents (AT-06), SignQueue (AT-13), Service Completion (AT-18) & Immutability (AT-23) (4326.3ms)

▶ Module 6 - Patient Billing: Invoices (AT-01), Cashier Race Prevention (AT-02), Deposit Applications (AT-15), Monetary Controls & Maker-Checker (AT-20)
  ✔ Setup: Login Admin, Create 2 Cashiers, Patient, Visit, Service & Complete Procedure (2546.5ms)
  ✔ Subtest 1: Cashier Shift Management (Ca thu ngân) (201.1ms)
  ✔ Subtest 2: Deposits & Monetary Validation (AT-20) (181.6ms)
  ✔ Subtest 3: Issue Invoice from Completed Services (AT-01, AT-18, AT-20) (337.2ms)
  ✔ Subtest 4: AT-15 Race Condition - Concurrent Deposit Applications Prevention (541.8ms)
  ✔ Subtest 5: AT-02 Race Condition - Concurrent Payment Prevention on Invoice Outstanding (121.0ms)
  ✔ Subtest 6: Refunds & Maker-Checker Rule (AT-20) (80.9ms)
  ✔ Subtest 7: Discount Approvals & Maker-Checker Rule (AT-18, AT-20) (101.5ms)
  ✔ Subtest 8: Close Cashier Shift & Cash Reconciliation (57.3ms)
✔ Module 6 - Patient Billing: Invoices (AT-01), Cashier Race Prevention (AT-02), Deposit Applications (AT-15), Monetary Controls & Maker-Checker (AT-20) (4643.4ms)

▶ Module 7 - Inventory: FEFO Expiry Control (AT-07), Lot Recall & Tracing (AT-08), Serial Implant Anti-Reuse (AT-12)
  ✔ Setup: Login Admin, Create Warehouse User, Supplier, Warehouse & Items (1405.2ms)
  ✔ Subtest 1: Goods Receipt (Nhập kho) with Lots & Serial Generation (148.5ms)
  ✔ Subtest 2: AT-07 FEFO Expiry Rule & Expired Lot Dispense Prevention (122.2ms)
  ✔ Subtest 3: AT-08 Lot Recall, Immediate Dispense Blocking & Patient Tracing (284.1ms)
  ✔ Subtest 4: AT-12 Serial Implant Management & Anti-Reuse Enforcement (81.6ms)
✔ Module 7 - Inventory: FEFO Expiry Control (AT-07), Lot Recall & Tracing (AT-08), Serial Implant Anti-Reuse (AT-12) (2664.0ms)

▶ Module 8 - Accounting: Cash Shift Discrepancies (AT-09), Accounting Period Closing (AT-10), Double-Entry Bookkeeping
  ✔ Setup: Login Admin, Create Accountant, Cashier & Approver, Open Cash Shift (2324.5ms)
  ✔ Subtest 1: AT-09 Cash Shift Discrepancies, Reconciliation & Maker-Checker Resolution (138.9ms)
  ✔ Subtest 2: AT-10 Accounting Period Closing & Backdated Posting Prohibition (97.8ms)
  ✔ Subtest 3: Double-Entry Balanced Enforcement & Maker-Checker on Journal Posting (133.7ms)
✔ Module 8 - Accounting: Cash Shift Discrepancies (AT-09), Accounting Period Closing (AT-10), Double-Entry Bookkeeping (3288.5ms)

▶ Module 9 - Commercial Health Insurance (BHTM): AT-03, AT-04, AT-14
  ✔ 1. Tạo Hợp đồng bảo lãnh BHTM với CoverageRulesJson (allowPatientRecovery = false) (1340.2ms)
  ✔ 2. [AT-14] Lập hồ sơ bồi thường và Chống gửi lặp hồ sơ (Anti-replay / Duplicate Prevention) (127.6ms)
  ✔ 3. [AT-03] BHTM duyệt 1 triệu nhưng chưa chuyển tiền (Phải thu BHTM ghi nhận, tiền bank chưa tăng, CHƯA SETTLED) (94.3ms)
  ✔ 4. [AT-04] BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân (Không tự chuyển nợ; tạo quyết định xử lý phần thiếu) (128.2ms)
  ✔ 5. [AT-14] Nhận tiền thiếu từ BHTM (Ghi chênh lệch, không tăng doanh thu, hồ sơ chưa SETTLED) (82.9ms)
  ✔ 6. Thanh toán phần còn lại, Kế toán trưởng duyệt xử lý tranh chấp và đóng Claim -> CLOSED (122.0ms)
✔ Module 9 - Commercial Health Insurance (BHTM): AT-03, AT-04, AT-14 (2625.7ms)

▶ Module 10 - Operations: Sterilization, Instruments, Lab Orders, Warranties & Incidents (AT-22)
  ✔ 1. Đăng ký tài sản tiệt trùng, phòng mổ và vật tư dụng cụ (1240.5ms)
  ✔ 2. [AT-22] Chu trình tiệt trùng FAILED -> Các gói dụng cụ tự động cách ly QUARANTINED, chặn xuất (110.2ms)
  ✔ 3. [AT-22] Chặn sử dụng gói dụng cụ khi máy tiệt trùng hỏng / quá hạn kiểm định (ASSET_NOT_QUALIFIED) (85.6ms)
  ✔ 4. [AT-22] Chặn sử dụng gói dụng cụ quá hạn tiệt trùng, tự động ghi nhận sự cố CONTAMINATED_USAGE (132.8ms)
  ✔ 5. [AT-22] Ngoại lệ cấp cứu: Cho phép sử dụng nhưng bắt buộc ghi nhận sự cố y khoa CRITICAL (OPEN) (105.4ms)
  ✔ 6. [AT-22] Chống tái sử dụng gói dụng cụ đã hoàn tất (PACK_ALREADY_USED) (78.3ms)
  ✔ 7. Quản lý Labo & Làm lại (LabReworks): Bản ghi riêng biệt không sửa đè đơn gốc (UQ_LabReworks_Order_No) (142.1ms)
  ✔ 8. Đăng ký Thẻ bảo hành nha khoa & Báo cáo sự cố y khoa (118.9ms)
✔ Module 10 - Operations: Sterilization, Instruments, Lab Orders, Warranties & Incidents (AT-22) (2890.3ms)

▶ Module 11 - HR, Commissions & Payroll: Anti-Double Commission, Adjustments & Locked Payroll
  ✔ 1. Tạo quy tắc hoa hồng và kiểm tra Maker-Checker khi phê duyệt (1238.4ms)
  ✔ 2. Chặn chồng chéo phiên bản quy tắc hoa hồng cùng phạm vi (COMMISSION_RULE_OVERLAP) (35.9ms)
  ✔ 3. Tạo kỳ lương mới ở trạng thái OPEN (18.9ms)
  ✔ 4. Tính hoa hồng cho Bác sĩ theo sự kiện hoàn thành thủ thuật (32.4ms)
  ✔ 5. [Quy tắc cốt lõi] Chặn tính hoa hồng lần 2 cho cùng dòng tiền/sự kiện (Anti-Double Commission) (13.3ms)
  ✔ 6. [Quy tắc cốt lõi] Hoàn tiền thủ thuật tạo điều chỉnh số âm liên kết bản gốc (CommissionAdjustments) (46.6ms)
  ✔ 7. Tổng hợp bảng lương kỳ tính đúng Net Pay = BaseSalary + Commissions + Adjustments (24.7ms)
  ✔ 8. [Quy tắc cốt lõi] Khóa kỳ lương (LOCKED) và Chặn tính thêm hoặc điều chỉnh vào kỳ đã khóa (42.4ms)
  ✔ 9. Phân quyền: Bác sĩ xem hoa hồng của mình; bị chặn xem hoa hồng nhân viên khác (42.8ms)
✔ Module 11 - HR, Commissions & Payroll: Anti-Double Commission, Adjustments & Locked Payroll (1867.9ms)

▶ Module 12 - Assets Maintenance, Daily Reconciliation, AT-11 Post-Closing Refund & AT-19 Integrity
  ✔ 1. Ghi nhật ký bảo trì thiết bị PASS và FAIL (tự động chuyển trạng thái & cảnh báo) (1125.3ms)
  ✔ 2. Chạy quy trình đối soát cuối ngày quét toàn diện và tự động phát hiện sai lệch (ReconciliationItems) (500.4ms)
  ✔ 3. Phân xử giải quyết sai lệch đối soát (OPEN -> RESOLVED) (19.7ms)
  ✔ 4. [AT-11] Hoàn tiền sau khi khóa sổ: Chặn sửa kỳ cũ; ghi điều chỉnh ở kỳ mở liên kết chứng từ gốc (38.7ms)
  ✔ 5. [AT-19] Kiểm tra toàn vẹn cơ sở dữ liệu: Xác thực mã băm chữ ký số EMR & khóa ngoại (8.9ms)
  ✔ 6. Xuất Báo cáo Đối soát Tổng hợp Cuối ngày đầy đủ chỉ số nghiệp vụ chuẩn v14 (11.9ms)
✔ Module 12 - Assets Maintenance, Daily Reconciliation, AT-11 Post-Closing Refund & AT-19 Integrity (2043.1ms)

✔ password policy rejects missing character classes and bcrypt truncation (2.6ms)
✔ bcrypt hashes verify and do not store the cleartext password (14.1ms)
✔ request logging omits URL query, headers and clinical payload (2.3ms)
✔ missing SQL credentials fail before opening any connection (630.3ms)

Tổng kết:
- Tổng số test: 96
- Số test pass: 96 (100%)
- Số test fail: 0
- Số test cancelled / skipped: 0
```

---

## 3. Dữ liệu Kiểm thử Nghiệm thu Tiêu chí AT (Acceptance Criteria)

| Tiêu chí | Mô tả kịch bản | Kết quả mong đợi | Kết quả kiểm thử thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AT-01** | Bất biến hóa đơn, phiếu thu & dịch vụ hoàn thành | Hóa đơn tính đúng Gross, không sửa đè lịch sử, thu tiền ghi append-only | Xuất hóa đơn từ các dịch vụ đã chốt `COMPLETED`; tính đúng `gross`, `invoiceLines`, `paymentAllocations`, `receivables`. Mỗi lần thanh toán tạo bản ghi `PaymentTransactions` mới không sửa đè | **ĐẠT (Passed)** |
| **AT-02** | Hai thu ngân cùng thu tiền cho một hóa đơn | Không thu vượt số tiền còn nợ của hóa đơn | Áp dụng khóa `WITH (UPDLOCK, HOLDLOCK)` trên SQL Server. Khi 2 thu ngân cùng gửi lệnh thu tiền mà tổng vượt quá số nợ còn lại, giao dịch thứ hai bị từ chối ngay với mã `409 Conflict` (`PAYMENT_EXCEEDS_OUTSTANDING`) | **ĐẠT (Passed)** |
| **AT-03** | BHTM duyệt 1 triệu nhưng chưa chuyển tiền | Phải thu BHTM còn 1 triệu; tiền ngân hàng chưa tăng; chưa `SETTLED` | Khi BHTM xét duyệt chấp thuận (`POST /api/insurance/claims/:id/adjudicate`), hồ sơ chuyển sang trạng thái `APPROVED`, số tiền duyệt `ApprovedAmount = 1,000,000đ`, `SettledAmount = 0`. Hệ thống ghi nhận khoản công nợ `Receivables` (DebtorType='BHTM') đúng 1.000.000đ ở trạng thái `OPEN`. Tiền ngân hàng chưa tăng và hồ sơ tuyệt đối không tự ý chuyển sang `SETTLED` | **ĐẠT (Passed)** |
| **AT-04** | BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân | Không tự chuyển nợ; tạo quyết định xử lý phần thiếu | Khi yêu cầu bảo lãnh 2.000.000đ nhưng BHTM chỉ duyệt 1.500.000đ, hệ thống đọc cấu hình `CoverageRulesJson.allowPatientRecovery = false` và KHÔNG tự động tăng công nợ bệnh nhân (`Receivables` DebtorType='PATIENT' không bị tăng). Hệ thống tự động tạo bản ghi `ClaimDisputes` với số tiền thiếu 500.000đ (trạng thái `OPEN`) ghi rõ lý do hợp đồng không cho thu lại bệnh nhân và chờ Kế toán trưởng phê duyệt phương án cơ sở chịu chi phí | **ĐẠT (Passed)** |
| **AT-05** | Hai bệnh nhân dùng chung số điện thoại | Cảnh báo trùng SĐT, vẫn tạo được hồ sơ riêng sau khi xác minh | Khi trùng SĐT, API trả mã cảnh báo `PHONE_DUPLICATE_WARNING` kèm danh sách bệnh nhân trùng. Khi gửi cờ `confirmDuplicatePhone: true`, hệ thống tạo hồ sơ riêng với mã bệnh nhân riêng biệt | **ĐẠT (Passed)** |
| **AT-06** | Rút đồng thuận sau một phần thủ thuật | Giữ phần đã làm, dừng phần chưa làm, không xóa EMR | Khi bệnh nhân rút đồng thuận (`REVOKED`), các dịch vụ đã hoàn thành (`COMPLETED`) được giữ nguyên vẹn; các dịch vụ đang chờ (`PLANNED`) tự động chuyển thành `CANCELLED`. Bản ghi Consent chuyển trạng thái `REVOKED`, hồ sơ EMR không bị xóa | **ĐẠT (Passed)** |
| **AT-07** | Xuất kho thuốc, vật tư theo nguyên tắc FEFO & Chặn xuất lô hết hạn | Xuất ưu tiên theo hạn dùng gần nhất (FEFO); chặn xuất lô quá hạn | Khi xuất kho mặt hàng thuốc/vật tư, hệ thống tự động ưu tiên xuất từ lô có `ExpiryDate` sớm nhất còn khả dụng (`Available > 0`). Cố tình chỉ định xuất từ lô đã hết hạn (`ExpiryDate < Today`) bị từ chối với mã lỗi `400 Bad Request` (`EXPIRED_LOT_CANNOT_DISPENSE`) | **ĐẠT (Passed)** |
| **AT-08** | Thu hồi lô thuốc/vật tư khẩn cấp & Truy vết bệnh nhân đã dùng | Khóa ngay tồn kho còn lại; truy vết toàn bộ bệnh nhân đã sử dụng | Khi có quyết định thu hồi lô (`POST /api/inventory/lots/:id/recall`), trạng thái lô chuyển sang `RECALLED`, toàn bộ số lượng khả dụng còn lại bị khóa sang `Blocked` (`Available = 0`), chặn mọi hành vi xuất cấp tiếp theo (`409 Conflict` - `LOT_RECALLED_CANNOT_DISPENSE`). API `/api/inventory/lots/:id/trace` truy vết chính xác danh sách bệnh nhân, mã bệnh án, bác sĩ điều trị và ngày sử dụng từ `StockMovements` | **ĐẠT (Passed)** |
| **AT-09** | Ca thu ngân lệch tiền mặt cuối ca & Maker-Checker phân xử | Bắt buộc giải trình chênh lệch; thu ngân không tự duyệt phân xử | Khi kiểm đếm tiền mặt phát hiện chênh lệch với số tiền lý thuyết, API yêu cầu bắt buộc nhập lý do giải trình (`DISCREPANCY_REASON_REQUIRED`). Hệ thống tạo bản ghi `CashDiscrepancies` ở trạng thái `PENDING`. Thu ngân lập biên bản tự phê duyệt bị chặn với `403 Forbidden` (`MAKER_CANNOT_APPROVE`); chỉ Kế toán trưởng (`isApprover = true`) mới được duyệt | **ĐẠT (Passed)** |
| **AT-10** | Khóa sổ kế toán ngày / kỳ kế toán & Chặn ghi lùi ngày | Chặn tuyệt đối ghi lùi ngày hoặc sửa chứng từ thuộc kỳ đã đóng | Khi một kỳ kế toán chuyển sang trạng thái `CLOSED` (`POST /api/accounting/periods/:id/close`), mọi yêu cầu ghi sổ bút toán có `PostingDate` thuộc kỳ này bị từ chối với mã lỗi `400 Bad Request` (`PERIOD_ALREADY_CLOSED_CANNOT_POST`), đảm bảo tính bất biến của sổ sách kế toán | **ĐẠT (Passed)** |
| **AT-11** | Hoàn tiền sau khi khóa sổ kế toán | Không sửa đè chứng từ kỳ cũ; ghi nhận điều chỉnh vào kỳ mở liên kết chứng từ gốc | Khi giao dịch thanh toán thuộc kỳ kế toán đã đóng (`CLOSED`), không được sửa đè chứng từ kỳ cũ. Yêu cầu hoàn tiền được ghi nhận vào kỳ kế toán đang MỞ (`OPEN`) hiện tại, lưu vết liên kết `PaymentTransactionId` gốc, chặn hoàn vượt số tiền đã thu thực tế (`REFUND_EXCEEDS_PAYMENT`), áp dụng Maker-Checker người duyệt khác người yêu cầu | **ĐẠT (Passed)** |
| **AT-12** | Quản lý Trụ Implant theo Mã Serial & Chống tái sử dụng | Serial duy nhất trên toàn hệ thống; trụ đã cấy ghép không được dùng lại | Mỗi trụ Implant có mã Serial duy nhất (ràng buộc `UQ_StockSerials_Number`). Khi bác sĩ cấy ghép, Serial chuyển sang trạng thái `CONSUMED`. Cố tình cấy ghép lại Serial này lần thứ hai bị chặn ngay lập tức với mã lỗi `409 Conflict` (`SERIAL_ALREADY_IMPLANTED`) | **ĐẠT (Passed)** |
| **AT-13** | Mất mạng khi ký EMR | Không giả chữ ký; nháp/chờ ký có audit và hạn xử lý | Khi mô phỏng mất kết nối (`simulateNetworkLoss: true`), hệ thống từ chối trả về chữ ký giả mạo (Status giữ `DRAFT`), đẩy yêu cầu vào bảng `SignQueue` với trạng thái `PENDING` kèm `DueAt = now() + 24h`. Khi mạng phục hồi, xử lý ký bù thành công và tạo chữ ký SHA-256 hợp lệ | **ĐẠT (Passed)** |
| **AT-14** | Gửi lặp hồ sơ BHTM, duyệt một phần, nhận tiền thiếu | Không trùng hồ sơ/chứng từ; công nợ và sai lệch đúng từng lần | (1) Chống gửi lặp: Khi submit lại cùng `InsuranceClaimId`, `VersionNo` và `Destination`, hệ thống từ chối ngay với `409 Conflict` (`DUPLICATE_CLAIM_SUBMISSION`), chống gửi trùng chứng từ. (2) Duyệt một phần: Claim chuyển `PARTIALLY_APPROVED`. (3) Nhận tiền thiếu: Khi BHTM chuyển khoản 1.200.000đ trên số duyệt 1.500.000đ, hệ thống ghi nhận `InsuranceClaimPayments` trạng thái `MISMATCH`, tăng `SettledAmount` lên 1.200.000đ, giữ Claim chưa `SETTLED`, công nợ BHTM còn thiếu 300.000đ và tự động tạo `ClaimDisputes`. Không tăng doanh thu khi nhận tiền. Chống lặp mã giao dịch ngân hàng `DUPLICATE_PAYMENT_REFERENCE` (409) | **ĐẠT (Passed)** |
| **AT-15** | Hai thu ngân cấn cọc đồng thời vượt số dư cọc | Không cấn cọc âm, chặn giao dịch vượt số dư | Sử dụng khóa `WITH (UPDLOCK, HOLDLOCK)` trên bảng `Deposits`. Khi 2 thu ngân cấn cọc đồng thời với tổng số tiền vượt quá số dư cọc hiện tại, một giao dịch thành công và giao dịch còn lại bị chặn với mã `409 Conflict` (`DEPOSIT_BALANCE_INSUFFICIENT`) | **ĐẠT (Passed)** |
| **AT-16** | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản giá; phiên bản mới áp dụng từ ngày hiệu lực | Phiên bản giá lưu theo dòng `ServicePriceVersions`, có `VersionNo`, `EffectiveFrom`, `EffectiveTo`, không sửa đè bản ghi cũ | **ĐẠT (Passed)** |
| **AT-17** | Người lập tự duyệt hoàn; gọi API đọc EMR không có quan hệ điều trị | API từ chối và ghi log audit | Bác sĩ không có phân công lượt khám hoặc quan hệ điều trị với bệnh nhân gọi `GET /api/visits/:id/emr` bị chặn với mã `403 FORBIDDEN` (mã `NO_TREATMENT_RELATIONSHIP`), tự động ghi `DENIED` vào `AccessAuditLogs` | **ĐẠT (Passed)** |
| **AT-18** | Chia giảm giá để né duyệt; gọi lặp chốt dịch vụ | Không tạo hai doanh thu hoặc hai lần trừ kho | Khi dịch vụ đã được hoàn thành đủ số lượng, lần gọi lặp tiếp theo của `POST /services/:id/complete` bị chặn ngay lập tức với mã `409 Conflict` (`SERVICE_ALREADY_COMPLETED`), ngăn ngừa việc nhân đôi doanh thu hoặc trừ kho hai lần | **ĐẠT (Passed)** |
| **AT-19** | Kiểm tra toàn vẹn CSDL, audit & chữ ký số EMR | Xác thực mã băm chữ ký số EMR 64-hex SHA-256 và quan hệ khóa ngoại | API `GET /api/reconciliation/integrity-check` quét toàn bộ phiên bản EMR `Status = 'SIGNED'` để xác minh định dạng SHA-256 64-hex, đồng thời kiểm tra toàn vẹn tham chiếu khóa ngoại giữa các bảng nghiệp vụ cốt lõi (Orphan Visits, Orphan Invoices). Đạt kết luận `INTEGRITY_VERIFIED` khi không có dữ liệu sai lệch | **ĐẠT (Passed)** |
| **AT-20** | Kiểm soát tiền tệ & Maker-Checker tài chính | Chặn số âm, chặn giảm giá > Gross, chặn hoàn vượt thực thu; người tạo không tự duyệt | API chặn ngay lập tức số tiền âm hoặc bằng 0 (`INVALID_AMOUNT`). Chặn giảm giá vượt `gross` (`DISCOUNT_EXCEEDS_GROSS`). Chặn hoàn tiền vượt thực thu (`REFUND_EXCEEDS_PAYMENT`). Người lập yêu cầu hoàn tiền hoặc giảm giá tự phê duyệt bị chặn với `403 Forbidden` (`MAKER_CANNOT_APPROVE`) | **ĐẠT (Passed)** |
| **AT-21** | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời (ngăn chặn chồng chéo thời gian) | Kiểm tra `checkPriceOverlap()` trước khi chuyển trạng thái sang `APPROVED`. Khi có khoảng thời gian chồng lấn, API trả lỗi `409 Conflict` mã `PRICE_VERSION_OVERLAP` | **ĐẠT (Passed)** |
| **AT-22** | Thiết bị không đạt chuẩn/quá hạn hiệu chuẩn hoặc chu trình tiệt trùng lỗi; chặn gói quá hạn tiệt trùng | Chặn dùng thiết bị lỗi/quá hạn; chu trình hỏng cách ly gói; chặn gói hết hạn; ngoại lệ cấp cứu ghi nhận diễn biến kèm sự cố CRITICAL | (1) Chu trình tiệt trùng FAIL -> toàn bộ gói dụng cụ tự động chuyển sang `QUARANTINED`, chặn xuất. (2) Thiết bị hỏng hoặc quá hạn hiệu chuẩn (`MaintenanceStatus != 'OPERATIONAL'` hoặc `NextMaintenanceDate < Now`) -> Chặn xuất gói dụng cụ (`ASSET_NOT_QUALIFIED`). (3) Gói quá hạn tiệt trùng (`ExpiryDate < Now`) -> Chặn xuất (`PACK_STERILIZATION_EXPIRED`), cập nhật pack thành `EXPIRED` và ghi nhận sự cố y khoa `Incidents` (loại `CONTAMINATED_USAGE`). (4) Ngoại lệ cấp cứu (`isEmergency: true`, `emergencyReason`): Cho phép ghi nhận `PackUsages` để cứu bệnh nhân, nhưng bắt buộc tự động tạo `Incidents` loại `EMERGENCY_OVERRIDE` mức `CRITICAL` (trạng thái `OPEN`) để Hội đồng chuyên môn hậu kiểm. (5) Chống tái sử dụng: Gói dụng cụ đã `CONSUMED` bị chặn tuyệt đối không cho dùng lại (`PACK_ALREADY_USED` - 409) | **ĐẠT (Passed)** |
| **AT-23** | Sửa ID, nội dung EMR đã ký | API/CSDL từ chối; chỉ cho phụ lục/điều chỉnh có tham chiếu | Hồ sơ EMR sau khi ký số (`SIGNED`) chuyển sang trạng thái BẤT BIẾN. Cố tình sửa nội dung qua API bị trả lỗi `400 Bad Request` (`EMR_VERSION_LOCKED_CANNOT_UPDATE`). Mọi bổ sung, đính chính bắt buộc thông qua bảng phụ lục `EmrAddenda` | **ĐẠT (Passed)** |
| **AT-24** | Báo cáo đối soát tổng hợp cuối ngày chuẩn v14 | Tổng hợp đa chiều tiền mặt, doanh thu, tiệt trùng, labo và sai lệch đối soát | API `GET /api/reconciliation/daily-report` tổng hợp đầy đủ chỉ số từ 5 nguồn: Ca thu ngân (`ActualCash`, `ExpectedCash`, `TotalDiscrepancy`), Hóa đơn & công nợ (`TotalBilled`, `TotalCollected`, `TotalOutstanding`), Chu kỳ tiệt trùng (`PASS`/`FAIL`), Đơn Labo (`ACCEPTED`/`Rework`), Bất thường đối soát (`Pending`/`Critical`) | **ĐẠT (Passed)** |
| **Maker-Checker** | Người lập không được là người duyệt | Người tạo không duyệt giao dịch của mình; cần cờ `IsApprover=1` | Endpoint `/prices/:versionId/approve`, `/refunds/:id/approve`, `/discount-approvals/:id/approve` kiểm tra `user.isApprover === true` hoặc `ADMIN`. Người lập tự duyệt bị chặn với `403 Forbidden` | **ĐẠT (Passed)** |
| **Soft-Delete (Nhóm A)** | Xóa mềm qua trigger archive | Dữ liệu chuyển sang bảng `_Deleted`, ghi nhận `DeletedAt`, `DeletedBy` | Thao tác DELETE trên `Services`, `Rooms`, `Users`, `Patients` kích hoạt trigger INSTEAD OF DELETE, lấy username từ `SESSION_CONTEXT(N'username')` | **ĐẠT (Passed)** |
| **Toàn vẹn (Nhóm B)** | Bệnh nhân đã có lượt khám không thể xóa | Chặn xóa hồ sơ đã phát sinh dữ liệu điều trị | Thao tác xóa bệnh nhân đã có `Visits` bị từ chối với mã lỗi `409 Conflict` (`PATIENT_HAS_VISITS`) | **ĐẠT (Passed)** |

---

## 4. Dữ liệu Kiểm thử Trực tiếp API Thu ngân & Viện phí (Module 6 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/billing/shifts/open` | POST | Thu ngân | `openingFloat: -1000` | `400 Bad Request` | Chặn tiền đầu ca âm: `INVALID_OPENING_FLOAT` |
| `/api/billing/shifts/open` | POST | Thu ngân | `openingFloat: 500000` | `201 Created` | Mở ca thành công, trạng thái `OPEN` |
| `/api/billing/shifts/open` | POST | Thu ngân | Mở tiếp ca 2 khi ca 1 đang mở | `409 Conflict` | Chặn mở ca trùng: `SHIFT_ALREADY_OPEN` |
| `/api/billing/shifts/current` | GET | Thu ngân | Không | `200 OK` | Trả về ca làm việc hiện tại đang mở |
| `/api/billing/shifts/:id/close` | POST | Thu ngân | `actualCash: 1300000` | `200 OK` | Đóng ca, đối soát `expectedCash` với doanh thu thực |
| `/api/billing/deposits` | POST | Thu ngân | `amount: -500000` | `400 Bad Request` | Chặn cọc âm: `INVALID_AMOUNT` (AT-20) |
| `/api/billing/deposits` | POST | Thu ngân | `amount: 2000000, method: 'CASH'` | `201 Created` | Tạo cọc thành công, `balance = 2000000` |
| `/api/billing/visits/:id/invoices` | POST | Thu ngân | `approvedDiscount > gross` | `400 Bad Request` | Chặn giảm giá > Gross: `DISCOUNT_EXCEEDS_GROSS` (AT-20) |
| `/api/billing/visits/:id/invoices` | POST | Thu ngân | Dịch vụ đã hoàn tất | `201 Created` | Xuất hóa đơn thành công (AT-01), tạo `InvoiceLines` |
| `/api/billing/visits/:id/invoices` | POST | Thu ngân | Xuất lặp khi không còn dịch vụ | `400 Bad Request` | Chặn xuất lặp: `NO_COMPLETED_SERVICES_TO_INVOICE` |
| `/api/billing/invoices/:id/apply-deposit` | POST | 2 Thu ngân đồng thời | Tổng tiền cấn > Số dư cọc | `409 Conflict` | Race condition cấn cọc bị chặn: `DEPOSIT_BALANCE_INSUFFICIENT` (AT-15) |
| `/api/billing/invoices/:id/pay` | POST | 2 Thu ngân đồng thời | Tổng tiền thu > Số nợ hóa đơn | `409 Conflict` | Race condition thu vượt bị chặn: `PAYMENT_EXCEEDS_OUTSTANDING` (AT-02) |
| `/api/billing/payments/:id/refunds` | POST | Thu ngân | `amount > paidAmount` | `400 Bad Request` | Chặn hoàn vượt thực thu: `REFUND_EXCEEDS_PAYMENT` (AT-20) |
| `/api/billing/payments/:id/refunds` | POST | Thu ngân | Số tiền hợp lệ, lý do | `201 Created` | Lập đề xuất hoàn tiền thành công |
| `/api/billing/refunds/:id/approve` | POST | Người lập tự duyệt | Không | `403 Forbidden` | Chặn tự duyệt hoàn tiền: `MAKER_CANNOT_APPROVE` (Maker-Checker) |
| `/api/billing/refunds/:id/approve` | POST | Admin / Approver | Không | `200 OK` | Duyệt hoàn tiền thành công |
| `/api/billing/invoices/:id/discount-approvals` | POST | Thu ngân | Số tiền giảm, lý do | `201 Created` | Lập đề xuất giảm giá sau hóa đơn |
| `/api/billing/discount-approvals/:id/approve` | POST | Thu ngân tự duyệt | Không | `403 Forbidden` | Chặn tự duyệt: `APPROVER_ROLE_REQUIRED` (Maker-Checker) |
| `/api/billing/discount-approvals/:id/approve` | POST | Admin / Approver | Không | `200 OK` | Duyệt giảm giá thành công, cộng vào `approvedDiscount` |

### Dữ liệu Kiểm thử Trực tiếp API Kho thuốc, Vật tư & Implant (Module 7 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/inventory/receipts` | POST | Quản lý kho | Serial count mismatch (Số lượng 2 nhưng chỉ 1 serial) | `400 Bad Request` | Chặn mismatch serial: `SERIAL_COUNT_MISMATCH` |
| `/api/inventory/receipts` | POST | Quản lý kho | Nhập thuốc theo Lô + Hạn dùng (LIDO-L01, LIDO-L02) | `201 Created` | Tạo `GoodsReceipts`, sinh `StockLots`, cộng tồn `StockBalances` |
| `/api/inventory/receipts` | POST | Quản lý kho | Nhập trụ Implant có danh sách Serial duy nhất | `201 Created` | Tạo `StockSerials` trạng thái `AVAILABLE` (AT-12) |
| `/api/inventory/dispense` | POST | Quản lý kho | Xuất không chỉ định lô (Auto-FEFO) | `200 OK` | Tự động chọn lô hết hạn gần nhất (AT-07), trừ tồn kho khả dụng |
| `/api/inventory/dispense` | POST | Quản lý kho | Cố tình xuất Lô đã hết hạn (`EXPIRED`) | `400 Bad Request` | Chặn xuất lô hết hạn: `EXPIRED_LOT_CANNOT_DISPENSE` (AT-07) |
| `/api/inventory/lots/:id/recall` | POST | Quản lý kho | Lý do thu hồi khẩn cấp | `201 Created` | Ban hành lệnh thu hồi: Lot `RECALLED`, khóa tồn `Blocked` (AT-08) |
| `/api/inventory/dispense` | POST | Quản lý kho | Thử xuất từ Lô đang có lệnh thu hồi | `409 Conflict` | Chặn xuất lô thu hồi: `LOT_RECALLED_CANNOT_DISPENSE` (AT-08) |
| `/api/inventory/lots/:id/trace` | GET | Bác sĩ / Quản lý | `stockLotId` | `200 OK` | Truy vết chính xác danh sách bệnh nhân đã dùng lô này (AT-08) |
| `/api/inventory/serials/implant` | POST | Bác sĩ | `serialNumber: 'SN-IMP-...'`, `eventId` | `200 OK` | Cấy ghép thành công, chuyển serial sang `CONSUMED` (AT-12) |
| `/api/inventory/serials/implant` | POST | Bác sĩ | Cố tình cấy ghép lại Serial đã `CONSUMED` | `409 Conflict` | Chặn tái sử dụng: `SERIAL_ALREADY_IMPLANTED` (AT-12) |

### Dữ liệu Kiểm thử Trực tiếp API Kế toán & Ca thu ngân (Module 8 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/accounting/shifts/:id/reconcile` | POST | Thu ngân | Kiểm đếm lệch nhưng không nhập lý do | `400 Bad Request` | Chặn thiếu giải trình: `DISCREPANCY_REASON_REQUIRED` (AT-09) |
| `/api/accounting/shifts/:id/reconcile` | POST | Thu ngân | Kiểm đếm từng mệnh giá + Lý do giải trình | `200 OK` | Lưu `CashCounts`, tạo `CashDiscrepancies` `PENDING` (AT-09) |
| `/api/accounting/discrepancies/:id/resolve` | POST | Thu ngân tự duyệt | `status: 'APPROVED'` | `403 Forbidden` | Chặn người lập tự duyệt: `MAKER_CANNOT_APPROVE` (Maker-Checker AT-09) |
| `/api/accounting/discrepancies/:id/resolve` | POST | Kế toán viên thường | `status: 'APPROVED'` | `403 Forbidden` | Chặn không đủ thẩm quyền: `APPROVER_ROLE_REQUIRED` |
| `/api/accounting/discrepancies/:id/resolve` | POST | Kế toán trưởng | `status: 'APPROVED'`, ý kiến phê duyệt | `200 OK` | Phê duyệt phân xử chênh lệch thành công (AT-09) |
| `/api/accounting/periods` | POST | Kế toán trưởng | `code: 'PER-...'`, `startsOn`, `endsOn` | `201 Created` | Mở kỳ kế toán mới, trạng thái `OPEN` |
| `/api/accounting/periods/:id/close` | POST | Kế toán trưởng | Không | `200 OK` | Khóa sổ kỳ kế toán thành công, trạng thái `CLOSED` (AT-10) |
| `/api/accounting/journal-entries` | POST | Kế toán | Ghi lùi ngày vào kỳ đã khóa sổ | `400 Bad Request` | Chặn ghi lùi ngày: `PERIOD_ALREADY_CLOSED_CANNOT_POST` (AT-10) |
| `/api/accounting/journal-entries` | POST | Kế toán | Lập bút toán vào kỳ đang mở (Nợ = Có) | `201 Created` | Tạo bút toán `JournalEntries` và `JournalLines` ở `DRAFT` |
| `/api/accounting/journal-entries/:id/post` | POST | Kế toán trưởng | Bút toán không cân bằng (Nợ != Có) | `500 Error` | Trigger `TR_JournalEntries_PostBalanced` chặn ghi sổ không cân bằng |
| `/api/accounting/journal-entries/:id/post` | POST | Kế toán viên tự duyệt | Bút toán cân bằng của chính mình | `403 Forbidden` | Chặn tự duyệt: `MAKER_CANNOT_APPROVE` (Maker-Checker CSDL) |
| `/api/accounting/journal-entries/:id/post` | POST | Kế toán trưởng duyệt | Bút toán cân bằng Nợ = Có | `200 OK` | Ghi sổ thành công, trạng thái chuyển `POSTED` |

### Dữ liệu Kiểm thử Trực tiếp API Bảo lãnh BHTM (Module 9 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/insurance/contracts` | POST | Kế toán duyệt (Approver) | Tạo HĐ: `coverageRulesJson: { allowPatientRecovery: false }` | `201 Created` | Tạo `InsuranceContracts` thành công, lưu quy tắc AT-04 |
| `/api/insurance/claims` | POST | Thu ngân / Kế toán | Lập claim từ hóa đơn / dòng dịch vụ (1.000.000đ) | `201 Created` | Tạo `InsuranceClaims` trạng thái `VALIDATED`, lưu `InsuranceClaimLines` |
| `/api/insurance/claims/:id/submit` | POST | Kế toán | Nộp hồ sơ lần 1 (`versionNo: 1`, `destination: 'BAO_VIET'`) | `200 OK` | Tạo `InsuranceClaimVersions`, Claim chuyển `ACKNOWLEDGED` (AT-14) |
| `/api/insurance/claims/:id/submit` | POST | Kế toán | Nộp lặp lại cùng `versionNo` và `destination` | `409 Conflict` | Chặn gửi trùng hồ sơ/chứng từ: `DUPLICATE_CLAIM_SUBMISSION` (AT-14) |
| `/api/insurance/claims/:id/adjudicate` | POST | Kế toán | Duyệt đủ 1.000.000đ nhưng chưa chuyển tiền | `200 OK` | Claim chuyển `APPROVED`, `SettledAmount = 0` (chưa SETTLED), công nợ `Receivables` (BHTM) ghi nhận 1.000.000đ `OPEN`, bank chưa tăng (AT-03) |
| `/api/insurance/claims/:id/adjudicate` | POST | Kế toán | Claim 2.000.000đ nhưng chỉ duyệt 1.500.000đ | `200 OK` | Claim chuyển `PARTIALLY_APPROVED`. Đọc hợp đồng `allowPatientRecovery = false` -> KHÔNG chuyển nợ sang bệnh nhân; Tự động sinh `ClaimDisputes` 500.000đ `OPEN` (AT-04) |
| `/api/insurance/payments` | POST | Kế toán | Nhận tiền thiếu: Duyệt 1.500.000đ nhưng chỉ nhận 1.200.000đ | `200 OK` | `InsuranceClaimPayments` trạng thái `MISMATCH`, tăng `SettledAmount = 1.200.000đ`, Claim giữ nguyên chưa `SETTLED`, nợ BHTM còn 300.000đ, sinh `ClaimDisputes` ghi nhận thiếu hụt (AT-14) |
| `/api/insurance/payments` | POST | Kế toán | Gửi lặp lại cùng mã giao dịch ngân hàng `ExternalReference` | `409 Conflict` | Chặn lặp giao dịch ngân hàng: `DUPLICATE_PAYMENT_REFERENCE` (AT-02 / AT-14) |
| `/api/insurance/payments` | POST | Kế toán | Nhận nốt 300.000đ còn lại | `200 OK` | `SettledAmount = 1.500.000đ` (= số duyệt), công nợ BHTM chuyển `PAID` |
| `/api/insurance/disputes/:id/resolve` | POST | Kế toán trưởng (Approver) | Quyết định cơ sở phòng khám chịu chi phí 500.000đ | `200 OK` | Dispute chuyển `RESOLVED`; Mọi dispute đã đóng & nhận đủ tiền -> Claim đóng `CLOSED` |

### Dữ liệu Kiểm thử Trực tiếp API Tiệt trùng, Labo & Bảo hành (Module 10 Live API Endpoints - AT-22)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/operations/cycles` | POST | Nhân viên tiệt trùng / Kho | Chu trình FAILED (`result = 'FAILED'`) | `201 Created` | Tạo chu trình thất bại; toàn bộ các gói tiệt trùng thuộc chu trình này tự động chuyển `QUARANTINED`, chặn xuất sử dụng (AT-22) |
| `/api/operations/packs/dispense` | POST | Bác sĩ / Trợ thủ | Thiết bị hỏng hoặc quá hạn hiệu chuẩn (`ASSET_BROKEN`) | `400 Bad Request` | Chặn xuất dùng gói dụng cụ: `ASSET_NOT_QUALIFIED` (AT-22) |
| `/api/operations/packs/dispense` | POST | Bác sĩ / Trợ thủ | Gói dụng cụ quá hạn tiệt trùng (`ExpiryDate < Now`) | `400 Bad Request` | Chặn xuất dùng gói quá hạn: `PACK_STERILIZATION_EXPIRED`, tự động chuyển pack thành `EXPIRED` và ghi sự cố y khoa `Incidents` (loại `CONTAMINATED_USAGE`) |
| `/api/operations/packs/dispense` | POST | Bác sĩ cấp cứu | Gói hết hạn nhưng cấp cứu (`isEmergency: true`, lý do cấp cứu) | `200 OK` | Cho phép sử dụng (`PackUsages`) để cứu người bệnh, nhưng bắt buộc tự động tạo sự cố `Incidents` loại `EMERGENCY_OVERRIDE` mức `CRITICAL` ở trạng thái `OPEN` để Hội đồng chuyên môn hậu kiểm (AT-22) |
| `/api/operations/packs/dispense` | POST | Bác sĩ / Trợ thủ | Cố tình tái sử dụng gói đã `CONSUMED` | `409 Conflict` | Chặn tái sử dụng gói: `PACK_ALREADY_USED` (AT-22) |
| `/api/operations/lab-orders` | POST | Bác sĩ | Tạo đơn hàng Labo răng sứ Cercon | `201 Created` | Tạo đơn `LabOrders` thành công ở trạng thái `SENT` |
| `/api/operations/lab-orders/:id/rework` | POST | Bác sĩ | Labo không đạt chuẩn, yêu cầu làm lại | `201 Created` | Tạo bản ghi `LabReworks` độc lập với `reworkNo = 1` (ràng buộc `UQ_LabReworks_Order_No`), cập nhật đơn gốc `qcResult = 'FAIL'` không sửa đè lịch sử |
| `/api/operations/warranties` | POST | Bác sĩ / Thu ngân | Đăng ký thẻ bảo hành răng sứ 5 năm | `201 Created` | Tạo `Warranties` thành công, lưu thời hạn và điều kiện bảo hành |
| `/api/operations/incidents` | POST | Bác sĩ / Nhân viên | Báo cáo sự cố y khoa | `201 Created` | Ghi nhận sự cố `Incidents` kèm mức độ nghiêm trọng và hành động khắc phục |

### Dữ liệu Kiểm thử Trực tiếp API Hoa hồng & Bảng lương Nhân sự (Module 11 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/hr/commission-rules` | POST | Kế toán viên | Tạo quy tắc hoa hồng nháp (10%, COMPLETION) | `201 Created` | Tạo quy tắc trạng thái `DRAFT`, sinh phiên bản `VersionNo = 1` |
| `/api/hr/commission-rules/:id/approve` | POST | Người lập tự duyệt | Kế toán viên tự phê duyệt quy tắc của mình | `403 Forbidden` | Chặn tự duyệt quy tắc hoa hồng: `MAKER_CANNOT_APPROVE` (Maker-Checker) |
| `/api/hr/commission-rules/:id/approve` | POST | Kế toán trưởng (Approver) | Phê duyệt quy tắc hợp lệ | `200 OK` | Phê duyệt thành công, chuyển sang `APPROVED`, gán `ApprovedBy` |
| `/api/hr/commission-rules/:id/approve` | POST | Kế toán trưởng | Duyệt quy tắc thứ 2 trùng phạm vi và thời gian | `409 Conflict` | Chặn chồng chéo thời gian hiệu lực: `COMMISSION_RULE_OVERLAP` |
| `/api/hr/payroll-periods` | POST | Kế toán viên | Tạo kỳ lương mới (`PR-2026-10`, StartsOn, EndsOn) | `201 Created` | Tạo kỳ lương thành công ở trạng thái `OPEN` |
| `/api/hr/commissions/calculate` | POST | Kế toán viên | Tính hoa hồng cho bác sĩ từ sự kiện thủ thuật (2.5tr x 10%) | `201 Created` | Tính thành công hoa hồng 250.000đ, trạng thái `CALCULATED` |
| `/api/hr/commissions/calculate` | POST | Kế toán viên | Tính lặp lại cho cùng sự kiện thủ thuật + bác sĩ + quy tắc | `409 Conflict` | Chặn tính 2 lần cho cùng một dòng tiền: `COMMISSION_ALREADY_CALCULATED` (Quy tắc cốt lõi) |
| `/api/hr/commissions/:id/adjust` | POST | Kế toán viên | Hoàn tiền thủ thuật: `amount = -50000`, kèm lý do | `201 Created` | Tạo bản ghi `CommissionAdjustments` số âm (-50.000đ) liên kết hoa hồng gốc, không sửa đè bản ghi gốc |
| `/api/hr/payroll-periods/:id/summary` | GET | Kế toán viên / Admin | Xem tổng hợp bảng lương kỳ | `200 OK` | Tính đúng `netPay` = BaseSalary (15tr) + Commissions (+250k) + Adjustments (-50k) = 15.200.000đ |
| `/api/hr/payroll-periods/:id/lock` | POST | Kế toán trưởng (Approver) | Khóa sổ kỳ lương hiện tại | `200 OK` | Khóa kỳ lương thành công, trạng thái `LOCKED`, gán `lockedAt` |
| `/api/hr/commissions/calculate` | POST | Kế toán viên | Cố tình tính thêm hoa hồng vào kỳ đã khóa (`LOCKED`) | `400 Bad Request` | Chặn sửa bảng lương đã khóa: `PERIOD_ALREADY_LOCKED` (Quy tắc cốt lõi) |
| `/api/hr/commissions/:id/adjust` | POST | Kế toán viên | Cố tình tạo điều chỉnh vào kỳ đã khóa (`LOCKED`) | `400 Bad Request` | Chặn sửa bảng lương đã khóa: `PERIOD_ALREADY_LOCKED` (Quy tắc cốt lõi) |
| `/api/hr/commissions` | GET | Bác sĩ | Bác sĩ tra cứu danh sách hoa hồng | `200 OK` | Hệ thống tự động giới hạn chỉ trả về hoa hồng của chính bác sĩ |
| `/api/hr/commissions` | GET | Bác sĩ | Bác sĩ cố tình gửi query xem hoa hồng của nhân viên khác | `403 Forbidden` | Chặn xem hoa hồng nhân viên khác: `FORBIDDEN_EMPLOYEE_COMMISSION_ACCESS` |

### Dữ liệu Kiểm thử Trực tiếp API Tài sản & Đối soát Cuối ngày (Module 12 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/reconciliation/maintenance-logs` | POST | Quản lý kho | Bảo trì định kỳ ghế nha khoa đạt chuẩn (`result: 'PASS'`) | `201 Created` | Lưu `MaintenanceLogs` thành công, thiết bị duy trì `ACTIVE` |
| `/api/reconciliation/maintenance-logs` | POST | Quản lý kho | Hiệu chuẩn không đạt (`result: 'FAIL'`, rò rỉ van khí nén) | `201 Created` | Lưu log, tự động chuyển `Assets.Status` sang `MAINTENANCE` và cảnh báo |
| `/api/reconciliation/run` | POST | Kế toán viên | Chạy quy trình đối soát tự động (`branchId`, `date`) | `200 OK` | Quét toàn diện 5 nguồn bất thường, tự động sinh các `ReconciliationItems` (`newAnomaliesCount >= 2`) |
| `/api/reconciliation/items` | GET | Kế toán viên | Lọc danh sách bất thường (`status: 'OPEN'`) | `200 OK` | Trả về danh sách sai lệch kèm mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`) |
| `/api/reconciliation/items/:id/resolve` | POST | Kế toán viên | Phân xử sai lệch (`status: 'RESOLVED'`, biên bản kỹ thuật) | `200 OK` | Cập nhật mục đối soát sang `RESOLVED`, lưu vết nội dung giải quyết |
| `/api/reconciliation/post-closing-refund` | POST | Kế toán duyệt (Approver) | Hoàn vượt quá số tiền thực thu của hóa đơn cũ | `400 Bad Request` | Chặn hoàn vượt thực thu: `REFUND_EXCEEDS_PAYMENT` (AT-11) |
| `/api/reconciliation/post-closing-refund` | POST | Kế toán viên thường | Hoàn tiền kỳ cũ khi không có quyền Approver | `403 Forbidden` | Chặn thẩm quyền duyệt hoàn sau khóa sổ: `APPROVER_ROLE_REQUIRED` |
| `/api/reconciliation/post-closing-refund` | POST | Kế toán duyệt (Approver) | Hoàn 300.000đ sau khóa sổ, ghi nhận vào kỳ OPEN | `201 Created` | Tạo `Refunds` liên kết `PaymentTransactionId` gốc (AT-11), áp dụng Maker-Checker |
| `/api/reconciliation/integrity-check` | GET | Kế toán / Admin | Quét kiểm tra toàn vẹn CSDL & chữ ký EMR | `200 OK` | Trả về `INTEGRITY_VERIFIED`: 100% chữ ký EMR đúng định dạng SHA-256 64-hex, 0 orphan visits (AT-19) |
| `/api/reconciliation/daily-report` | GET | Kế toán / Admin | Xuất Báo cáo Đối soát Tổng hợp Cuối ngày | `200 OK` | Báo cáo đa chiều chuẩn v14: Doanh thu, Tiền mặt, Tiệt trùng, Labo, Sai lệch đối soát (AT-24) |

---

## 5. Danh sách Tài khoản Kiểm thử Đã Xác minh (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu mẫu | IsApprover | Quyền hạn kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin1234@` | `false` | Xem toàn bộ, quản trị người dùng, phân quyền, xem audit log, quản trị danh mục, phê duyệt chứng từ |
| **Tiếp nhận** | `receptionist` | `Receptionist1234@` | `false` | Đăng ký bệnh nhân, đặt lịch, tiếp nhận lượt khám, mở ca thu ngân, thu tiền, cấn cọc, đối soát tiền |
| **Bác sĩ** | `doctor` | `Doctor1234@` | `false` | Khám, EMR, sơ đồ răng, ký số, kê đơn, cận lâm sàng, chốt dịch vụ; kiểm soát quan hệ điều trị; chỉ xem hoa hồng của chính mình |
| **Kế toán** | `accountant` | `Accountant1234@` | `false` | Lập hóa đơn, chứng từ, ca thu ngân, đối soát, lập bút toán sổ cái, tính hoa hồng, điều chỉnh âm, lập kỳ lương |
| **Kế toán duyệt** | `approver` | `Approver1234@` | `true` | Phê duyệt phiên bản giá, quy tắc hoa hồng, duyệt hoàn tiền/giảm giá, phân xử lệch tiền (AT-09), khóa sổ kỳ kế toán (AT-10), khóa sổ bảng lương kỳ, duyệt hoàn sau khóa sổ (AT-11) |
| **Quản lý kho** | `warehouse` | `WarehouseManager1234@` | `false` | Nhập xuất tồn, lô, hạn dùng, tiệt trùng, labo, bảo trì thiết bị y tế; xem danh mục |

---

## 6. Ma trận Tiến độ Triển khai 12 Phân hệ Nghiệp vụ

| STT | Phân hệ (Module) | Schema CSDL | Backend API | Giao diện UI | Trạng thái nghiệm thu |
| :---: | :--- | :--- :--- | :--- :--- | :--- :--- | :--- |
| **1** | **Người dùng, Phân quyền & Audit** | Đã tạo (99 bảng) | Đã xong (Auth, Users, Audit) | Đã xong (Login, Dashboard, Users) | **HOÀN THÀNH (100%)** |
| **2** | **Danh mục & Cấu hình có phiên bản** | Đã tạo | Đã xong (Services, Prices, Rooms, Config) | Đã xong (Services, Prices, Rooms) | **HOÀN THÀNH (100%)** |
| **3** | **Quản lý Bệnh nhân** | Đã tạo | Đã xong (Patients, Allergies, Medical History) | Đã xong (Đăng ký, cảnh báo SĐT, chi tiết) | **HOÀN THÀNH (100%)** |
| **4** | **Lịch hẹn & Lượt khám (Visits)** | Đã tạo | Đã xong (Appointments, Visits, State Machine) | Đã xong (Tiếp nhận, gán Bác sĩ, đổi trạng thái) | **HOÀN THÀNH (100%)** |
| **5** | **EMR, Sơ đồ răng, Kế hoạch & Đồng thuận** | Đã tạo | Đã xong (EMR, ToothChart, Consents, Addenda) | Đã xong (Sơ đồ răng FDI, Ký số, Phụ lục, Hàng đợi ký) | **HOÀN THÀNH (100%)** |
| **6** | **Thanh toán, Thu ngân & Công nợ** | Đã tạo | Đã xong (Shifts, Invoices, Deposits, Payments) | Đã xong (Trang Thu ngân, Cấn cọc, Đóng mở ca) | **HOÀN THÀNH (100%)** |
| **7** | **Kho thuốc, Vật tư & Implant** | Đã tạo | Đã xong (FEFO, Lot Recall, Implant Serial) | Đã xong (Tồn kho FEFO, Thu hồi Lô, Quản lý Serial) | **HOÀN THÀNH (100%)** |
| **8** | **Kế toán & Ca thu ngân** | Đã tạo | Đã xong (Đối soát ca, Khóa sổ, Hạch toán kép) | Đã xong (Kiểm đếm ca, Phân xử lệch, Khóa sổ kỳ, Sổ cái) | **HOÀN THÀNH (100%)** |
| **9** | **Bảo lãnh BHTM** | Đã tạo | Đã xong (Chống gửi trùng, Duyệt thiếu, Đối soát lệch) | Đã xong (Hồ sơ claim, Nộp BHTM, Phê duyệt, Xử lý lệch) | **HOÀN THÀNH (100%)** |
| **10** | **Tiệt trùng, Labo & Bảo hành** | Đã tạo | Đã xong (Sterilization, Packs, LabOrders, Warranties) | Đã xong (Gói tiệt trùng, Thiết bị, Labo Rework, Bảo hành & Sự cố) | **HOÀN THÀNH (100%)** |
| **11** | **Hoa hồng & Nhân sự** | Đã tạo | Đã xong (Commissions, Rules, Adjustments, Payroll) | Đã xong (Kỳ lương, Hoa hồng, Điều chỉnh âm, Quản lý NS) | **HOÀN THÀNH (100%)** |
| **12** | **Tài sản & Đối soát cuối ngày** | Đã tạo | Đã xong (Maintenance, Scanner, Refunds, Integrity) | Đã xong (Báo cáo cuối ngày, Bất thường, Bảo trì, AT-11, AT-19) | **HOÀN THÀNH (100%)** |

> **KẾT LUẬN TỔNG THỂ**: TOÀN BỘ 12/12 PHÂN HỆ NGHIỆP VỤ ĐÃ ĐƯỢC XÂY DỰNG VÀ NGHIỆM THU HOÀN TẤT 100%! ĐẠT TẤT CẢ CÁC TIÊU CHÍ AT-01 ĐẾN AT-24 VÀ BỘ TEST TỰ ĐỘNG (96/96 PASS 100%).

---

## 7. Lịch sử Commit Git

* `84b5098`: `module11: trien khai hoa hong, dieu chinh so am, khoa bang luong va phan quyen bac si`
* `3dead10`: `module10: trien khai tiet trung, labo, bao hanh va kiem soat AT-22`
* `43f48a5`: `module9: trien khai bao lanh BHTM AT-03, AT-04, AT-14 va giao dien Frontend`
* `fb0ce1f`: `module8: trien khai doi soat ca AT-09, khoa so ke toan AT-10, so nhat ky chung`
* `ac4c603`: `module7: trien khai kho FEFO AT-07, thu hoi lo AT-08, serial implant AT-12`
* `2f41a24`: `module6: trien khai hoa don AT-01, chan thu vuot no AT-02, can coc dong thoi AT-15, maker-checker AT-20`
* `5c9dcf9`: `module5: trien khai EMR bat bien AT-23, so do rang FDI, rut dong thuan AT-06, hang doi ky so AT-13, chot dich vu AT-18`
* `4d3dc81`: `module3-4: ho so benh nhan AT-05, tiep nhan luot kham, phan cong bac si AT-17 va bao cao Test.md`
* `a1b0608`: `module2: trien khai danh muc dich vu, phong ghe, bang gia phien ban va bao cao test`
* `6e712dd`: `module1: trien khai xac thuc JWT, phan quyen 5 role, audit log va quan ly nguoi dung`
* `3892f62`: `bat dau dung`
* `dc7b149`: `setup: tao moi truong local va schema nha khoa`

---

## 8. Cập nhật kiểm thử tăng cường ngày 15/10/2026

### 8.1. Hiện trạng và phạm vi

- **Đã có:** 12 module, RBAC, audit cơ bản, soft delete ở nhiều danh mục, EMR ký/khóa và addendum, thanh toán nhiều lần/hoàn tiền có maker-checker, kho FEFO/recall/serial, kế toán và đối soát.
- **Thiếu hoặc chưa đủ bằng chứng:** ma trận test chi tiết; kiểm thử responsive/accessibility bằng trình duyệt; giờ làm việc; đồng thời khi đặt lịch; liên kết bắt buộc chẩn đoán–thủ thuật; kiểm soát sửa kế hoạch đã duyệt; allergy/drug interaction và liều nhi khoa.
- **Sai logic đã xác nhận và sửa trong vòng này:** dữ liệu bệnh nhân thiếu/sai vẫn lọt; lịch hẹn trùng tài nguyên; lượt khám nhảy trạng thái; odontogram nhận mã răng/mặt răng tự do; màn EMR không luôn hiển thị dị ứng/bệnh nền.
- **Giả định cần chuyên gia xác nhận:** tuổi chuyển tiếp răng sữa chỉ cảnh báo, không chặn; quy tắc mặt răng đang dùng mức tối thiểu O cho răng sau/I cho răng trước; liều thuốc và tương tác thuốc chưa triển khai vì cần bác sĩ/dược sĩ và nguồn dữ liệu thuốc được phê duyệt.

### 8.2. Bằng chứng chạy test và tỷ lệ hiện tại

| Phạm vi | Pass | Fail | Blocked/Not tested | Kết luận |
| :--- | ---: | ---: | ---: | :--- |
| Baseline trước thay đổi (14/10/2026) | 96 | 0 | 0 | Lịch sử; không đại diện đầy đủ UI/biên/phân quyền |
| Nhóm thay đổi Patient + Appointment/Visit + Odontogram | 29 | 0 | 0 | `node --test ...`: **29/29 Pass** |
| Toàn bộ backend hiện tại | 110 | 7 | 0 | **110/117 Pass (94,02%)**; 7 lỗi do truy vấn SQL timeout/khóa 5–15 giây ở Module 5 và 11, xem BUG-006 |
| Frontend production build | 1 | 0 | 0 | Build thành công, 3.270 modules; có cảnh báo bundle lớn |
| UI thủ công desktop/mobile | 0 | 0 | 3 | **Blocked:** in-app browser chặn `http://localhost:5173` với `ERR_BLOCKED_BY_CLIENT` |

| Module | Tình trạng vòng này | Pass/Fail/NT | Ghi chú |
| :--- | :--- | :--- | :--- |
| 1–2, 6–10, 12 | Regression tự động | Pass trong lần full run hiện tại | Không mở rộng test UI trong vòng này |
| 3 Bệnh nhân | Validation + integration | 10 Pass / 1 Blocked | Thêm DOB, liên hệ, guardian; trùng hồ sơ đầy đủ còn thiếu |
| 4 Lịch hẹn/Lượt khám | Validation + integration | 7 Pass / 4 Not tested | Chặn trùng bác sĩ/phòng và state machine; giờ làm việc/đồng thời chưa đủ |
| 5 EMR/Odontogram | Unit + integration + build | 8 Pass / 5 Fail/Blocked/NT | Odontogram đạt unit test; regression EMR bị SQL timeout trong full run |
| 11 Nhân sự | Regression | 8 Pass / 1 Fail | Case danh sách hoa hồng bác sĩ timeout SQL |

### 8.3. Tham khảo sản phẩm và nguyên tắc áp dụng

Không sao chép nội dung hay tài sản thiết kế. Chỉ dùng các nguyên tắc điều hướng, hiển thị và kiểm soát nghiệp vụ từ tài liệu chính thức.

| Hệ thống | Quan sát có thể áp dụng | Nguồn |
| :--- | :--- | :--- |
| Open Dental | Chart module gom lịch sử, kế hoạch và thông tin y khoa; tooth chart hỗ trợ cấu hình đánh số, màu/trạng thái lịch sử; thủ thuật có treatment area theo tooth/surface/quadrant/arch; mặt răng B/F, V, M, O/I, D, L. | [Chart Module](https://www.opendental.com/site/0_chart.html), [Graphical Tooth Chart](https://www.opendental.com/manual/graphicaltoothchart.html), [Enter Treatment](https://www.opendental.com/manual/entertreatment.html), [Procedure Edit](https://opendental.com/manual/procedureedit.html) |
| Dentally | Patient chart có permanent/deciduous/mixed dentition, history/sidebar và treatment tabs; lịch hẹn có booked/unbooked và liên kết treatment plan; medical history được thu thập trong hồ sơ bệnh nhân. | [Charting](https://help.dentally.com/en/articles/3565932-how-to-chart-in-dentally), [Appointments](https://help.dentally.com/en/articles/3551480-how-to-use-the-appointments-tab), [Treatment-plan appointment](https://help.dentally.com/en/articles/12165237-how-to-add-appointments-to-a-treatment-plan), [Medical history](https://help.dentally.com/en/collections/3993924-patient-medical-history-tab) |
| OpenMRS | Patient dashboard giữ demographics ở header, đặt allergy/problem list nổi bật, và tổ chức visits/encounters theo tab/timeline. | [Patient Dashboard](https://guide.openmrs.org/collecting-data/the-patient-dashboard-in-depth/) |
| OpenEMR | Dashboard dùng widget có thể cấu hình cho allergy/problem/medication/prescription; calendar và ACL tách quyền đặt lịch trùng/ngoài template. | [Patient Record](https://www.open-emr.org/wiki/index.php/HOWTO%3A_Create_a_New_Patient_Record_-_OpenEMR_v7), [Calendar](https://www.open-emr.org/wiki/index.php/TheCalendarNotes-v7), [Access Controls](https://www.open-emr.org/wiki/index.php/Access_Controls_Listing) |
| Dentrix Enterprise | Tham khảo luồng enterprise theo patient, appointment, chart và treatment planning; chưa dùng tài sản giao diện. | [Learner's Guide](https://hsps.pro/DentrixEnterprise/Documentation/Dentrix_Enterprise_11.0.43_Learners_Guide_-_CDCR.pdf) |
| Carestream Dental | Scheduler và charting tách rõ lịch hẹn, chart, điều trị và tài liệu đào tạo thao tác. | [Scheduler Workbook](https://help.carestreamdental.com/rh/web/server/SoftDent_Scheduler/projects_responsive/OH_DE1010/assets/docs/NG941_Scheduler_ITW.pdf), [Charting Workbook](https://help.carestreamdental.com/rh/web/server/SoftDent/projects_responsive/DE1075_SDChart_Wkbk/PDFs/DE1075_SD_ChartingWorkbook.pdf) |
| DentIQ (Việt Nam) | Mẫu Patient 360, lịch hẹn, sơ đồ răng, EMR và billing cùng hệ thống phù hợp hướng tổng quát hóa tại Việt Nam. | [DentIQ](https://www.dentiq.vn/) |
| Curve Dental | Chưa xác minh được tài liệu UI/luồng chính thức đủ chi tiết trong vòng này. | **Cần nghiên cứu tiếp; không suy diễn** |

Luồng mục tiêu thống nhất: **Đăng ký → Lịch hẹn → Tiếp đón → Khám → Chẩn đoán → Kế hoạch điều trị → Thực hiện → Đơn thuốc → Thanh toán → Tái khám**. Cảnh báo y khoa phải luôn nhìn thấy trong ngữ cảnh khám; odontogram phải hỗ trợ FDI, răng sữa/vĩnh viễn và thao tác theo mặt răng.

### 8.4. Bảng test case chi tiết

| ID | Module | Mô tả | Điều kiện tiên quyết | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái | Mức độ | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| PAT-001 | Bệnh nhân | Tạo người lớn hợp lệ | API chạy | Gọi validator/API tạo BN | Tên có khoảng trắng, DOB quá khứ, phone/email hợp lệ | Chuẩn hóa và lưu | Unit test đạt | Pass | High | Dữ liệu giả |
| PAT-002 | Bệnh nhân | Chặn ngày sinh tương lai | Không | Validate payload | Ngày mai | 400 `DATE_OF_BIRTH_IN_FUTURE` | Đúng mã lỗi | Pass | High | UI cũng khóa ngày tương lai |
| PAT-003 | Bệnh nhân | Trẻ dưới 18 tuổi phải có guardian | Không | Validate không/có guardian | DOB trẻ vị thành niên | Không guardian bị chặn; có guardian được nhận | Unit test đạt | Pass | Critical | Cần pháp chế xác nhận trường guardian tối thiểu |
| PAT-004 | Bệnh nhân | Chặn phone/email sai | Không | Validate payload | `abc`, `not-email` | 400, không ghi DB | Unit test đạt | Pass | Medium | Có validation UI và service |
| PAT-005 | Bệnh nhân | Không tự gán năm sinh hiện tại khi thiếu DOB | Không | Tạo payload chỉ có tên | Không DOB/birthYear | Bị chặn trường bắt buộc | Unit test đạt | Pass | High | Sửa hành vi cũ gây sai tuổi |
| PAT-006 | Bệnh nhân | Cảnh báo trùng SĐT | Có BN cùng phone | Tạo BN mới | Phone đã tồn tại | Cảnh báo, cần xác nhận | Integration đạt | Pass | High | Chưa đủ khóa trùng họ tên+DOB+SĐT |
| PAT-007 | Bệnh nhân | Form responsive và bàn phím | App local chạy | Test 360/768/1440px, tab/focus | Form thêm BN | Không tràn; focus rõ; lỗi gắn trường | Không mở được localhost trong browser tool | Blocked | Medium | `ERR_BLOCKED_BY_CLIENT` |
| APT-001 | Lịch hẹn | Tạo lịch tương lai hợp lệ | Patient/branch/doctor có sẵn | POST appointment | start/end ISO tương lai | 201 BOOKED | Validator đạt | Pass | High | Bác sĩ bắt buộc |
| APT-002 | Lịch hẹn | Chặn quá khứ và end ≤ start | Không | Validate 3 payload biên | Quá khứ, invalid date, đảo giờ | 400 | Unit test đạt | Pass | High | Không kiểm tra giờ làm việc |
| APT-003 | Lịch hẹn | Chặn trùng bác sĩ | Có lịch active | POST khoảng giao nhau | Cùng doctor/branch | 409 `APPOINTMENT_RESOURCE_CONFLICT` | Integration đạt | Pass | Critical | So sánh overlap chuẩn `start < end2 && end > start2` |
| APT-004 | Lịch hẹn | Chặn trùng ghế/phòng | Có room + lịch active | POST cùng room | Doctor khác, room giống | 409 | Code đã có; chưa có test DB riêng | Not tested | Critical | Bổ sung integration test |
| APT-005 | Lịch hẹn | Hai request đồng thời cùng slot | SQL chạy | Gửi Promise.all 2 POST | Cùng doctor/room/time | Chỉ 1 thành công | Chưa chạy test concurrency | Not tested | Critical | Transaction SERIALIZABLE đã áp dụng nhưng cần stress test |
| APT-006 | Lịch hẹn | Ngoài giờ làm việc | Có cấu hình ca làm | POST ngoài ca | 02:00 hoặc ngày nghỉ | Bị chặn/trình quyền override | Chưa có cấu hình giờ làm | Not tested | High | OpenEMR gợi ý ACL override riêng |
| VIS-001 | Lượt khám | Luồng chuẩn | Visit REGISTERED | Đổi IN_PROGRESS → CLINICAL_COMPLETED → CLOSED | Trạng thái hợp lệ | Từng bước thành công | Integration/unit đạt | Pass | Critical | Máy trạng thái mới |
| VIS-002 | Lượt khám | Chặn nhảy bước | Visit REGISTERED | Đổi thẳng CLINICAL_COMPLETED | Trạng thái bỏ qua | 400 `INVALID_VISIT_STATUS_TRANSITION` | Integration đạt | Pass | Critical | Lỗi cũ đã sửa |
| VIS-003 | Lượt khám | Hủy/tạm giữ cần lý do | Visit active | Đổi CANCELLED/ON_HOLD | reason rỗng | 400 | Unit test đạt | Pass | High | Phục vụ audit |
| VIS-004 | Lượt khám | Cập nhật lặp/đồng thời | Hai người dùng | Gửi 2 transition cùng lúc | Cùng version visit | Một thao tác thắng, thao tác kia conflict | Chưa có optimistic lock | Not tested | High | Rủi ro race condition |
| ODO-001 | Odontogram | Mã FDI răng vĩnh viễn/răng sữa | Không | Validate chart | 11–48 và 51–85 hợp lệ | Được nhận | Unit test đạt | Pass | Critical | 32 răng vĩnh viễn + 20 răng sữa |
| ODO-002 | Odontogram | Chặn mã răng ngoài FDI | Không | Validate chart | 10, 49, 50, 86 | 400 `INVALID_TOOTH_CODE` | Unit test đạt | Pass | Critical | Không nhận free text |
| ODO-003 | Odontogram | Chặn mặt răng sai/không tồn tại | Không | Validate chart | `X`, O trên răng trước, I trên răng sau | 400 | Unit test đạt | High | High | Quy tắc tối thiểu cần nha sĩ duyệt |
| ODO-004 | Odontogram | Sâu răng phải gắn mặt răng | Không | Validate CARIES | surface null | 400 `TOOTH_SURFACE_REQUIRED` | Unit test đạt | Pass | High | Cho phép nhiều tổn thương/răng theo mặt |
| ODO-005 | Odontogram | Chặn trùng răng+mặt | Không | Gửi 2 finding giống nhau | 16-O lặp | 400 | Unit test đạt | Pass | Medium | Tránh ghi đè mơ hồ |
| ODO-006 | Odontogram | Người lớn chọn răng sữa | Patient DOB người lớn | Lưu 55-M | Răng sữa ở người lớn | Lưu kèm cảnh báo | Unit test đạt | Pass | Medium | **Cần nha sĩ xác nhận**, không tự chặn |
| ODO-007 | Odontogram UI | Chọn dentition và surface | Frontend chạy | Chọn răng, mặt, thêm finding | Permanent/primary; M/O/I/D/B/F/L/P | UI phản hồi và lưu đúng | Build đạt; thao tác thật bị chặn | Blocked | High | Cần manual E2E |
| EMR-001 | EMR | API visit trả dị ứng/bệnh nền | Patient có allergy/history | GET visit | Allergy giả | Dữ liệu nằm trong patient | Integration đạt | Pass | Critical | Dùng cho thanh cảnh báo |
| EMR-002 | EMR | Cảnh báo y khoa luôn hiển thị | Mở EMR | Cuộn/tạo draft | Patient có dị ứng | Banner sticky, rõ ràng | Code/build đạt, chưa kiểm tra trực quan | Blocked | Critical | Không xem như clinical decision support |
| EMR-003 | EMR | Hồ sơ ký chỉ thêm addendum | EMR đã ký | Thử sửa trực tiếp rồi thêm phụ lục | Nội dung giả | Sửa bị chặn, addendum được lưu | Lịch sử 14/10 Pass; full run hiện tại timeout dây chuyền | Fail | Critical | BUG-006, cần rerun môi trường DB sạch |
| TPL-001 | Kế hoạch điều trị | Thủ thuật gắn chẩn đoán | Có diagnosis | Thêm service line | Không diagnosis | Bị chặn/cảnh báo | Chưa triển khai ràng buộc | Not tested | Critical | Thiếu business rule |
| TPL-002 | Kế hoạch điều trị | Kế hoạch duyệt không sửa tự do | Plan APPROVED | Sửa giá/dịch vụ | Không lý do | Tạo revision + reason + audit | Chưa xác minh end-to-end | Not tested | Critical | Cần bổ sung versioning |
| RX-001 | Đơn thuốc | Chặn/cảnh báo thuốc trùng dị ứng | Có allergy | Kê hoạt chất liên quan | Thuốc giả mapping allergy | Cảnh báo nghiêm trọng hoặc chặn | Chưa có drug knowledge base | Not tested | Critical | **Cần bác sĩ/dược sĩ xác nhận** |
| RX-002 | Đơn thuốc | Liều trẻ em theo tuổi/cân nặng | Có DOB, weight | Kê thuốc nhi khoa | mg/kg giả | Kiểm tra liều, không tự suy đoán | Chưa triển khai | Not tested | Critical | **Cần dược sĩ xác nhận** |
| RX-003 | Đơn thuốc | Tương tác và số lượng/liều | Có danh sách thuốc | Kê cặp tương tác, qty ≤ 0 | Dữ liệu giả | Chặn qty/liều vô lý; cảnh báo tương tác | Chưa triển khai | Not tested | Critical | Cần nguồn tương tác được cấp phép |
| PAY-001 | Thanh toán | Không thu vượt dư nợ | Invoice có outstanding | Thu lớn hơn dư nợ | Số tiền giả | Bị chặn | Regression Module 6 đạt | Pass | Critical | AT-02/AT-20 |
| PAY-002 | Thanh toán | Nhiều lần và đồng thời | Invoice mở | Thu nhiều giao dịch | Hai cashier | Tổng không vượt dư nợ | Regression Module 6 đạt | Pass | Critical | Có race test |
| PAY-003 | Thanh toán | Hoàn tiền có kiểm soát | Có payment | Request/approve refund | Người tạo ≠ người duyệt | Append-only, maker-checker | Regression Module 6 đạt | Pass | Critical | Không xóa giao dịch gốc |
| SEC-001 | Bảo mật | RBAC hồ sơ và dữ liệu nhạy cảm | User nhiều role | Gọi API khác quyền | Doctor/receptionist/admin | 403 khi ngoài phạm vi | Regression Module 1 & AT-17 đạt | Pass | Critical | Masking chi tiết chưa test |
| SEC-002 | Bảo mật | Audit xem/sửa/xóa | Audit bật | Xem, sửa, soft delete | Hồ sơ giả | Có actor/time/action/outcome | Mới xác minh một phần qua audit hiện có | Not tested | High | Chưa chứng minh đủ cả view/edit/delete |
| UI-001 | UI chung | Build production | Dependencies có sẵn | `npm run build` | Source hiện tại | Exit 0 | Đạt, 3.270 modules | Pass | High | Bundle 1.688,52 kB |
| UI-002 | UI chung | Responsive 360/768/1440px | App local chạy | Mở các trang chính | Ba viewport | Không tràn/cắt thao tác | Browser tool chặn localhost | Blocked | Medium | CSS responsive đã thêm nhưng chưa nghiệm thu trực quan |
| UI-003 | UI chung | Keyboard/focus/a11y | App mở được | Tab, Enter, screen reader smoke | Không chuột | Focus rõ, label/role hợp lệ | Chưa chạy | Not tested | Medium | Mới thêm focus-visible/aria ở phần sửa |

### 8.5. Bug log

| Bug ID | Mô tả và bước tái hiện | Sai / Đúng mong đợi | Mức độ | Trạng thái | Test case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-001 | Tạo BN với DOB tương lai, contact sai hoặc trẻ em thiếu guardian. | Trước: có thể lọt/default năm hiện tại. Đúng: 400 theo trường. | Critical | **Fixed / Verified** | PAT-002–005 |
| BUG-002 | Tạo hai lịch giao nhau cùng bác sĩ/phòng. | Trước: cùng được lưu. Đúng: bản sau 409. | Critical | **Fixed / Verified** | APT-003; APT-004 cần test bổ sung |
| BUG-003 | Từ REGISTERED chuyển thẳng CLINICAL_COMPLETED. | Trước: được phép. Đúng: chỉ chuyển theo state machine. | Critical | **Fixed / Verified** | VIS-001–003 |
| BUG-004 | Gửi tooth code/surface tùy ý hoặc CARIES không có surface. | Trước: payload được lưu. Đúng: validation FDI/mặt răng. | Critical | **Fixed / Verified** | ODO-001–006 |
| BUG-005 | GET visit không trả allergy/medical history nên EMR không thể cảnh báo liên tục. | Trước: thiếu dữ liệu. Đúng: include dữ liệu và banner sticky. | Critical | **Fixed / Verified API; UI Blocked** | EMR-001–002 |
| BUG-006 | Chạy full backend làm truy vấn Module 5/11 timeout; tăng timeout 5→15 giây vẫn tái hiện. Bước: `npm test`. | Hiện tại: 110/117, 7 fail dây chuyền. Đúng: 117/117 ổn định. | High | **Open** | EMR-003; regression Module 11 |
| BUG-007 | Vite cảnh báo chunk JS sau minify >500 kB. | Hiện tại: 1.688,52 kB (gzip 515,95 kB). Đúng: code splitting/lazy route hợp lý. | Medium | **Open** | UI-001 |

### 8.6. Thay đổi giao diện đã áp dụng

- Đổi nhãn/branding sang thuật ngữ tổng quát **Dental EMR**, bỏ mã module/AT và tên phòng khám hard-code khỏi điều hướng.
- Sidebar có breakpoint/collapsed mode; tab EMR wrap; bảng có overflow; nội dung/card co giãn trên mobile; thêm `:focus-visible` cơ bản.
- Form bệnh nhân thêm email, người giám hộ, validation phone/email/DOB và hiển thị ngày `dd/MM/yyyy`.
- Hồ sơ khám có thanh cảnh báo dị ứng/bệnh nền sticky; trạng thái hồ sơ ký diễn đạt theo nghiệp vụ “chỉ bổ sung phụ lục”.
- Odontogram hỗ trợ chuyển răng vĩnh viễn/răng sữa, chọn mặt M/O-I/D/B/F/L/P và lưu nhiều finding theo răng+mặt.
- Lý do thiết kế: áp dụng mô hình patient header/medical alerts của OpenMRS/OpenEMR và treatment/chart principles của Open Dental/Dentally; không sao chép hình ảnh hay bố cục độc quyền.

### 8.7. Quy tắc nghiệp vụ đã bổ sung

| Mã | Ràng buộc | Nơi áp dụng | Test case |
| :--- | :--- | :--- | :--- |
| BR-PAT-001 | Họ tên và DOB/birthYear hợp lệ; DOB không tương lai; không gửi đồng thời DOB và birthYear. | UI + patient service | PAT-001, PAT-002, PAT-005 |
| BR-PAT-002 | Phone/email đúng định dạng; người dưới 18 tuổi cần guardian. | UI + patient service | PAT-003, PAT-004 |
| BR-APT-001 | Doctor bắt buộc; start/end hợp lệ, tương lai, end > start. | appointment validator/service | APT-001, APT-002 |
| BR-APT-002 | Không trùng bác sĩ hoặc phòng/ghế trong cùng branch với lịch active; kiểm tra trong transaction SERIALIZABLE. | appointment repository | APT-003–005 |
| BR-VIS-001 | Chuyển trạng thái theo state machine; CANCELLED/ON_HOLD cần lý do. | visit service | VIS-001–003 |
| BR-ODO-001 | Chỉ FDI 11–48 hoặc 51–85; surface thuộc M/O/I/D/B/F/L/P; O/I theo nhóm răng. | clinical service/validator | ODO-001–003 |
| BR-ODO-002 | CARIES cần surface; không lặp tooth+surface; răng sữa người lớn sinh warning. | clinical service/validator | ODO-004–006 |
| BR-EMR-001 | Ngữ cảnh visit phải mang allergy/history để hiển thị cảnh báo. | visit repository + EMR UI | EMR-001–002 |

### 8.8. Việc còn lại và rủi ro

1. Điều tra SQL blocking/transaction leak gây BUG-006, làm sạch môi trường test rồi chạy lại full suite; không công bố 100% khi còn 7 Fail.
2. Chạy manual/E2E bằng trình duyệt truy cập được localhost ở 360/768/1440px; kiểm tra keyboard, focus, empty/loading/error state.
3. Thêm test đồng thời lịch hẹn, xung đột phòng/ghế và cấu hình giờ làm/ACL override.
4. Hoàn thiện duplicate patient theo **họ tên chuẩn hóa + DOB + phone**, có cơ chế merge thay vì xóa cứng.
5. Bổ sung version/audit cho treatment plan đã duyệt và bắt buộc service line liên kết diagnosis/price version.
6. Prescription CDS (allergy, pediatric dose, interaction) chỉ làm sau khi bác sĩ/dược sĩ duyệt quy tắc và nguồn dữ liệu thuốc.
7. Rà soát audit cho thao tác xem/sửa/xóa và masking dữ liệu nhạy cảm theo role; chuẩn hóa timezone và `dd/MM/yyyy` toàn hệ thống.
8. Tách bundle theo route/lazy loading để xử lý BUG-007.

> **Kết luận hiện hành:** các thay đổi mới có 29/29 test mục tiêu đạt và frontend build đạt; toàn bộ backend hiện ở **110/117 Pass**, vì vậy trạng thái phát hành là **chưa đủ điều kiện nghiệm thu toàn phần** cho đến khi BUG-006 được khắc phục và các test Blocked/Not tested quan trọng được thực thi.
