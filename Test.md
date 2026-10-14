# BÁO CÁO KIỂM THỬ VÀ TRẠNG THÁI HỆ THỐNG (TEST.MD)

Dự án: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR**  
Thời điểm kiểm tra: 14/10/2026 23:38:00 (GMT+7)  
Môi trường: Local Windows 10/11, SQL Server 2022 Express, Node.js v24.21.0, React 19 + Vite 7

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

---

## 2. Dữ liệu Thu thập sau Kiểm thử Tự động (Automated Test Suite)

Chạy lệnh: `npm test` trong thư mục `backend/`  
Kết quả: **53/53 tests ĐẠT (100% Pass) - Thời gian: 5790ms**

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

✔ password policy rejects missing character classes and bcrypt truncation (2.6ms)
✔ bcrypt hashes verify and do not store the cleartext password (15.2ms)
✔ request logging omits URL query, headers and clinical payload (2.7ms)
✔ missing SQL credentials fail before opening any connection (525.8ms)

Tổng kết:
- Tổng số test: 53
- Số test pass: 53 (100%)
- Số test fail: 0
- Số test cancelled / skipped: 0
```

---

## 3. Dữ liệu Kiểm thử Nghiệm thu Tiêu chí AT (Acceptance Criteria)

| Tiêu chí | Mô tả kịch bản | Kết quả mong đợi | Kết quả kiểm thử thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AT-01** | Bất biến hóa đơn, phiếu thu & dịch vụ hoàn thành | Hóa đơn tính đúng Gross, không sửa đè lịch sử, thu tiền ghi append-only | Xuất hóa đơn từ các dịch vụ đã chốt `COMPLETED`; tính đúng `gross`, `invoiceLines`, `paymentAllocations`, `receivables`. Mỗi lần thanh toán tạo bản ghi `PaymentTransactions` mới không sửa đè | **ĐẠT (Passed)** |
| **AT-02** | Hai thu ngân cùng thu tiền cho một hóa đơn | Không thu vượt số tiền còn nợ của hóa đơn | Áp dụng khóa `WITH (UPDLOCK, HOLDLOCK)` trên SQL Server. Khi 2 thu ngân cùng gửi lệnh thu tiền mà tổng vượt quá số nợ còn lại, giao dịch thứ hai bị từ chối ngay với mã `409 Conflict` (`PAYMENT_EXCEEDS_OUTSTANDING`) | **ĐẠT (Passed)** |
| **AT-05** | Hai bệnh nhân dùng chung số điện thoại | Cảnh báo trùng SĐT, vẫn tạo được hồ sơ riêng sau khi xác minh | Khi trùng SĐT, API trả mã cảnh báo `PHONE_DUPLICATE_WARNING` kèm danh sách bệnh nhân trùng. Khi gửi cờ `confirmDuplicatePhone: true`, hệ thống tạo hồ sơ riêng với mã bệnh nhân riêng biệt | **ĐẠT (Passed)** |
| **AT-06** | Rút đồng thuận sau một phần thủ thuật | Giữ phần đã làm, dừng phần chưa làm, không xóa EMR | Khi bệnh nhân rút đồng thuận (`REVOKED`), các dịch vụ đã hoàn thành (`COMPLETED`) được giữ nguyên vẹn; các dịch vụ đang chờ (`PLANNED`) tự động chuyển thành `CANCELLED`. Bản ghi Consent chuyển trạng thái `REVOKED`, hồ sơ EMR không bị xóa | **ĐẠT (Passed)** |
| **AT-13** | Mất mạng khi ký EMR | Không giả chữ ký; nháp/chờ ký có audit và hạn xử lý | Khi mô phỏng mất kết nối (`simulateNetworkLoss: true`), hệ thống từ chối trả về chữ ký giả mạo (Status giữ `DRAFT`), đẩy yêu cầu vào bảng `SignQueue` với trạng thái `PENDING` kèm `DueAt = now() + 24h`. Khi mạng phục hồi, xử lý ký bù thành công và tạo chữ ký SHA-256 hợp lệ | **ĐẠT (Passed)** |
| **AT-15** | Hai thu ngân cấn cọc đồng thời vượt số dư cọc | Không cấn cọc âm, chặn giao dịch vượt số dư | Sử dụng khóa `WITH (UPDLOCK, HOLDLOCK)` trên bảng `Deposits`. Khi 2 thu ngân cấn cọc đồng thời với tổng số tiền vượt quá số dư cọc hiện tại, một giao dịch thành công và giao dịch còn lại bị chặn với mã `409 Conflict` (`DEPOSIT_BALANCE_INSUFFICIENT`) | **ĐẠT (Passed)** |
| **AT-16** | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản giá; phiên bản mới áp dụng từ ngày hiệu lực | Phiên bản giá lưu theo dòng `ServicePriceVersions`, có `VersionNo`, `EffectiveFrom`, `EffectiveTo`, không sửa đè bản ghi cũ | **ĐẠT (Passed)** |
| **AT-17** | Người lập tự duyệt hoàn; gọi API đọc EMR không có quan hệ điều trị | API từ chối và ghi log audit | Bác sĩ không có phân công lượt khám hoặc quan hệ điều trị với bệnh nhân gọi `GET /api/visits/:id/emr` bị chặn với mã `403 FORBIDDEN` (mã `NO_TREATMENT_RELATIONSHIP`), tự động ghi `DENIED` vào `AccessAuditLogs` | **ĐẠT (Passed)** |
| **AT-18** | Chia giảm giá để né duyệt; gọi lặp chốt dịch vụ | Không tạo hai doanh thu hoặc hai lần trừ kho | Khi dịch vụ đã được hoàn thành đủ số lượng, lần gọi lặp tiếp theo của `POST /services/:id/complete` bị chặn ngay lập tức với mã `409 Conflict` (`SERVICE_ALREADY_COMPLETED`), ngăn ngừa việc nhân đôi doanh thu hoặc trừ kho hai lần | **ĐẠT (Passed)** |
| **AT-20** | Kiểm soát tiền tệ & Maker-Checker tài chính | Chặn số âm, chặn giảm giá > Gross, chặn hoàn vượt thực thu; người tạo không tự duyệt | API chặn ngay lập tức số tiền âm hoặc bằng 0 (`INVALID_AMOUNT`). Chặn giảm giá vượt `gross` (`DISCOUNT_EXCEEDS_GROSS`). Chặn hoàn tiền vượt thực thu (`REFUND_EXCEEDS_PAYMENT`). Người lập yêu cầu hoàn tiền hoặc giảm giá tự phê duyệt bị chặn với `403 Forbidden` (`MAKER_CANNOT_APPROVE`) | **ĐẠT (Passed)** |
| **AT-21** | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời (ngăn chặn chồng chéo thời gian) | Kiểm tra `checkPriceOverlap()` trước khi chuyển trạng thái sang `APPROVED`. Khi có khoảng thời gian chồng lấn, API trả lỗi `409 Conflict` mã `PRICE_VERSION_OVERLAP` | **ĐẠT (Passed)** |
| **AT-23** | Sửa ID, nội dung EMR đã ký | API/CSDL từ chối; chỉ cho phụ lục/điều chỉnh có tham chiếu | Hồ sơ EMR sau khi ký số (`SIGNED`) chuyển sang trạng thái BẤT BIẾN. Cố tình sửa nội dung qua API bị trả lỗi `400 Bad Request` (`EMR_VERSION_LOCKED_CANNOT_UPDATE`). Mọi bổ sung, đính chính bắt buộc thông qua bảng phụ lục `EmrAddenda` | **ĐẠT (Passed)** |
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

---

## 5. Danh sách Tài khoản Kiểm thử Đã Xác minh (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu mẫu | IsApprover | Quyền hạn kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin1234@` | `false` | Xem toàn bộ, quản trị người dùng, phân quyền, xem audit log, quản trị danh mục, phê duyệt chứng từ |
| **Tiếp nhận** | `receptionist` | `Receptionist1234@` | `false` | Đăng ký bệnh nhân, đặt lịch, tiếp nhận lượt khám, mở ca thu ngân, thu tiền, cấn cọc |
| **Bác sĩ** | `doctor` | `Doctor1234@` | `false` | Khám, EMR, sơ đồ răng, ký số, kê đơn, cận lâm sàng, chốt dịch vụ; kiểm soát quan hệ điều trị |
| **Kế toán** | `accountant` | `Accountant1234@` | `false` | Lập hóa đơn, chứng từ, ca thu ngân, đối soát; xem danh mục giá dịch vụ |
| **Kế toán duyệt** | `approver` | `Approver1234@` | `true` | Phê duyệt phiên bản giá dịch vụ (Maker-Checker), duyệt hoàn tiền, duyệt giảm giá |
| **Quản lý kho** | `warehouse` | `WarehouseManager1234@` | `false` | Nhập xuất tồn, lô, hạn dùng, tiệt trùng, labo; xem danh mục |

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
| **7** | **Kho thuốc, Vật tư & Implant** | Đã tạo | Chờ triển khai | Chờ triển khai | Kế hoạch tiếp theo (AT-07, AT-08, AT-12) |
| **8** | **Kế toán & Ca thu ngân** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **9** | **Bảo lãnh BHTM** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **10** | **Tiệt trùng, Labo & Bảo hành** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **11** | **Hoa hồng & Nhân sự** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **12** | **Tài sản & Đối soát cuối ngày** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |

---

## 7. Lịch sử Commit Git

* `5c9dcf9`: `module5: trien khai EMR bat bien AT-23, so do rang FDI, rut dong thuan AT-06, hang doi ky so AT-13, chot dich vu AT-18`
* `4d3dc81`: `module3-4: ho so benh nhan AT-05, tiep nhan luot kham, phan cong bac si AT-17 va bao cao Test.md`
* `a1b0608`: `module2: trien khai danh muc dich vu, phong ghe, bang gia phien ban va bao cao test`
* `6e712dd`: `module1: trien khai xac thuc JWT, phan quyen 5 role, audit log va quan ly nguoi dung`
* `3892f62`: `bat dau dung`
* `dc7b149`: `setup: tao moi truong local va schema nha khoa`
