# BÁO CÁO KIỂM THỬ VÀ TRẠNG THÁI HỆ THỐNG (TEST.MD)

Dự án: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR**  
Thời điểm kiểm tra: 14/10/2026 23:25:00 (GMT+7)  
Môi trường: Local Windows 10/11, SQL Server 2022 Express, Node.js v24.21.0, React 19 + Vite 7

---

## 1. Tổng quan Trạng thái Hệ thống

| Thành phần | Công nghệ / Phiên bản | Cổng / Kết nối | Trạng thái | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Cơ sở dữ liệu** | SQL Server 2022 Express | `localhost:1433` | **READY (Đạt)** | Database `[Graduation Project]`, 99 bảng, migration `001-full-schema` |
| **Backend API** | Node.js (ESM) + Express 5 | `127.0.0.1:5000` | **READY (Đạt)** | Health check: Liveness (200 OK), Readiness (200 OK) |
| **Frontend UI** | React 19 + Vite + Ant Design | `127.0.0.1:5173` | **READY (Đạt)** | Vite build thành công, bọc AuthProvider + Router bảo vệ |
| **Module 1** | Auth, RBAC & Audit Logs | REST API + React | **READY (Đạt)** | 5 Role chuẩn, cơ chế Maker-Checker với cờ `IsApprover`, Soft-Delete |
| **Module 2** | Danh mục & Bảng giá Phiên bản | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-16 và AT-21, Soft-Delete Rooms/Services |
| **Module 3** | Quản lý Hồ sơ Bệnh nhân | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-05 (Trùng SĐT), tiền sử & dị ứng |
| **Module 4** | Lịch hẹn & Lượt khám (Visits) | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-17 (Quan hệ điều trị), máy trạng thái lượt khám |
| **Module 5** | EMR, Sơ đồ răng, Đồng thuận, Đơn thuốc & Chốt dịch vụ | REST API + React | **READY (Đạt)** | Nghiệm thu tiêu chí AT-06, AT-13, AT-18, AT-23, sơ đồ răng FDI 32 răng |

---

## 2. Dữ liệu Thu thập sau Kiểm thử Tự động (Automated Test Suite)

Chạy lệnh: `npm test` trong thư mục `backend/`  
Kết quả: **43/43 tests ĐẠT (100% Pass) - Thời gian: 2652ms**

```text
✔ liveness does not require SQL; readiness does query SQL (59.0ms)
✔ SQL failure is 503 without leaking SQL credentials or query (8.8ms)
✔ unknown API and invalid JSON have stable errors without stack traces (23.2ms)
✔ configuration parses false correctly and supports named instance or fixed port (2.9ms)

▶ Module 1 - Authentication & Authorization Integration Tests
  ✔ Admin login succeeds and returns JWT and role details (307.6ms)
  ✔ Receptionist login succeeds and returns RECEPTIONIST role (223.2ms)
  ✔ Login with wrong password fails with 401 without leaking internal details (227.1ms)
  ✔ Login with nonexistent user fails with 401 (17.6ms)
  ✔ GET /api/auth/me returns current user profile when authenticated (16.1ms)
  ✔ GET /api/auth/me rejects request without token with 401 (3.3ms)
  ✔ Admin can access GET /api/users (17.6ms)
  ✔ Receptionist is forbidden from accessing GET /api/users with 403 (12.5ms)
  ✔ Admin can view AccessAuditLogs with recorded actions (17.2ms)
✔ Module 1 - Authentication & Authorization Integration Tests (1181.6ms)

▶ Module 2 - Catalog & Versioned Configuration Integration Tests
  ✔ Receptionist can read services and see current active prices (42.8ms)
  ✔ Receptionist is forbidden from creating new services with 403 (12.1ms)
  ✔ Admin can create a new service with initial price version (30.3ms)
  ✔ Approver can approve a draft price version (Maker-Checker) (28.2ms)
  ✔ AT-21: Overlapping price versions cannot be approved simultaneously (19.6ms)
  ✔ Admin can soft-delete a service and archive it into Services_Deleted (48.2ms)
  ✔ Admin can restore a soft-deleted service (18.9ms)
  ✔ Authenticated staff can view system configuration versions (11.7ms)
✔ Module 2 - Catalog & Versioned Configuration Integration Tests (1289.3ms)

▶ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests
  ✔ Receptionist can create patient profile 1 with phone (33.6ms)
  ✔ AT-05: Creating patient 2 with same phone returns warning and requires confirmation (23.7ms)
  ✔ Receptionist can create visit and assign to Doctor (34.0ms)
  ✔ AT-17: Doctor can view patient profile when active treatment relationship exists (21.3ms)
  ✔ AT-17: Doctor CANNOT view patient 2 who has NO treatment relationship or assignment (14.0ms)
  ✔ Doctor can transition visit state to IN_PROGRESS and CLINICAL_COMPLETED (40.8ms)
  ✔ Patient with existing visits cannot be deleted (Business rule) (225.1ms)
✔ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests (1252.7ms)

▶ Module 5 - Clinical EMR, Consents (AT-06), SignQueue (AT-13), Service Completion (AT-18) & Immutability (AT-23)
  ✔ Setup: Login users and create test visit with doctor assignment (1040.0ms)
  ✔ EMR Draft creation and update (Chief complaint, Diagnoses, ToothChart) (81.6ms)
  ✔ AT-17: Doctor without treatment relationship is rejected with 403 (20.3ms)
  ✔ AT-13: Network loss simulation during signing pushes to SignQueue without fake signature (60.8ms)
  ✔ AT-23: EMR content cannot be modified directly once signed; Addenda required (49.2ms)
  ✔ AT-06: Consent Revocation stops planned procedures, keeps completed ones, never deletes EMR (241.4ms)
  ✔ AT-18: Service Completion - prevent duplicate completion call to prevent double billing/stock consumption (78.0ms)
✔ Module 5 - Clinical EMR, Consents (AT-06), SignQueue (AT-13), Service Completion (AT-18) & Immutability (AT-23) (1937.8ms)

✔ password policy rejects missing character classes and bcrypt truncation (2.6ms)
✔ bcrypt hashes verify and do not store the cleartext password (9.5ms)
✔ request logging omits URL query, headers and clinical payload (2.5ms)
✔ missing SQL credentials fail before opening any connection (360.6ms)

Tổng kết:
- Tổng số test: 43
- Số test pass: 43 (100%)
- Số test fail: 0
- Số test cancelled / skipped: 0
```

---

## 3. Dữ liệu Kiểm thử Nghiệm thu Tiêu chí AT (Acceptance Criteria)

| Tiêu chí | Mô tả kịch bản | Kết quả mong đợi | Kết quả kiểm thử thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AT-05** | Hai bệnh nhân dùng chung số điện thoại | Cảnh báo trùng SĐT, vẫn tạo được hồ sơ riêng sau khi xác minh | Khi trùng SĐT, API trả mã cảnh báo `PHONE_DUPLICATE_WARNING` kèm danh sách bệnh nhân trùng. Khi gửi cờ `confirmDuplicatePhone: true`, hệ thống tạo hồ sơ riêng với mã bệnh nhân riêng biệt | **ĐẠT (Passed)** |
| **AT-06** | Rút đồng thuận sau một phần thủ thuật | Giữ phần đã làm, dừng phần chưa làm, không xóa EMR | Khi bệnh nhân rút đồng thuận (`REVOKED`), các dịch vụ đã hoàn thành (`COMPLETED`) được giữ nguyên vẹn; các dịch vụ đang chờ (`PLANNED`) tự động chuyển thành `CANCELLED`. Bản ghi Consent chuyển trạng thái `REVOKED`, hồ sơ EMR không bị xóa | **ĐẠT (Passed)** |
| **AT-13** | Mất mạng khi ký EMR | Không giả chữ ký; nháp/chờ ký có audit và hạn xử lý | Khi mô phỏng mất kết nối (`simulateNetworkLoss: true`), hệ thống từ chối trả về chữ ký giả mạo (Status giữ `DRAFT`), đẩy yêu cầu vào bảng `SignQueue` với trạng thái `PENDING` kèm `DueAt = now() + 24h`. Khi mạng phục hồi, xử lý ký bù thành công và tạo chữ ký SHA-256 hợp lệ | **ĐẠT (Passed)** |
| **AT-16** | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản giá; phiên bản mới áp dụng từ ngày hiệu lực | Phiên bản giá lưu theo dòng `ServicePriceVersions`, có `VersionNo`, `EffectiveFrom`, `EffectiveTo`, không sửa đè bản ghi cũ | **ĐẠT (Passed)** |
| **AT-17** | Người lập tự duyệt hoàn; gọi API đọc EMR không có quan hệ điều trị | API từ chối và ghi log audit | Bác sĩ không có phân công lượt khám hoặc quan hệ điều trị với bệnh nhân gọi `GET /api/visits/:id/emr` bị chặn với mã `403 FORBIDDEN` (mã `NO_TREATMENT_RELATIONSHIP`), tự động ghi `DENIED` vào `AccessAuditLogs` | **ĐẠT (Passed)** |
| **AT-18** | Chia giảm giá để né duyệt; gọi lặp chốt dịch vụ | Không tạo hai doanh thu hoặc hai lần trừ kho | Khi dịch vụ đã được hoàn thành đủ số lượng, lần gọi lặp tiếp theo của `POST /services/:id/complete` bị chặn ngay lập tức với mã `409 Conflict` (`SERVICE_ALREADY_COMPLETED`), ngăn ngừa việc nhân đôi doanh thu hoặc trừ kho hai lần | **ĐẠT (Passed)** |
| **AT-21** | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời (ngăn chặn chồng chéo thời gian) | Kiểm tra `checkPriceOverlap()` trước khi chuyển trạng thái sang `APPROVED`. Khi có khoảng thời gian chồng lấn, API trả lỗi `409 Conflict` mã `PRICE_VERSION_OVERLAP` | **ĐẠT (Passed)** |
| **AT-23** | Sửa ID, nội dung EMR đã ký | API/CSDL từ chối; chỉ cho phụ lục/điều chỉnh có tham chiếu | Hồ sơ EMR sau khi ký số (`SIGNED`) chuyển sang trạng thái BẤT BIẾN. Cố tình sửa nội dung qua API bị trả lỗi `400 Bad Request` (`EMR_VERSION_LOCKED_CANNOT_UPDATE`). Mọi bổ sung, đính chính bắt buộc thông qua bảng phụ lục `EmrAddenda` | **ĐẠT (Passed)** |
| **Maker-Checker** | Người lập không được là người duyệt | Người tạo không duyệt giao dịch của mình; cần cờ `IsApprover=1` | Endpoint `/prices/:versionId/approve` kiểm tra `user.isApprover === true` hoặc `ADMIN`. Nhân viên không có quyền bị trả lỗi `403 Forbidden` | **ĐẠT (Passed)** |
| **Soft-Delete (Nhóm A)** | Xóa mềm qua trigger archive | Dữ liệu chuyển sang bảng `_Deleted`, ghi nhận `DeletedAt`, `DeletedBy` | Thao tác DELETE trên `Services`, `Rooms`, `Users`, `Patients` kích hoạt trigger INSTEAD OF DELETE, lấy username từ `SESSION_CONTEXT(N'username')` | **ĐẠT (Passed)** |
| **Toàn vẹn (Nhóm B)** | Bệnh nhân đã có lượt khám không thể xóa | Chặn xóa hồ sơ đã phát sinh dữ liệu điều trị | Thao tác xóa bệnh nhân đã có `Visits` bị từ chối với mã lỗi `409 Conflict` (`PATIENT_HAS_VISITS`) | **ĐẠT (Passed)** |

---

## 4. Dữ liệu Kiểm thử Trực tiếp API Lâm sàng (Module 5 Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/visits/:visitId/emr` | GET | Bác sĩ phụ trách | ID lượt khám | `200 OK` | Tự động khởi tạo phiên bản nháp v1 hoặc trả về hồ sơ EMR đầy đủ |
| `/api/visits/:visitId/emr` | GET | Bác sĩ không phân công | ID lượt khám | `403 Forbidden` | Bị từ chối: `NO_TREATMENT_RELATIONSHIP` (AT-17) |
| `/api/visits/:visitId/emr/:versionId` | PUT | Bác sĩ phụ trách | Chẩn đoán ICD-10, Sơ đồ răng | `200 OK` | Cập nhật chẩn đoán và sơ đồ răng nháp |
| `/api/visits/:visitId/emr/:versionId/sign` | POST | Bác sĩ phụ trách | `simulateNetworkLoss: true` | `503 Service Unavailable` | Ghi nhận vào `SignQueue` (AT-13), không sinh chữ ký giả |
| `/api/sign-queue/:queueId/retry` | POST | Bác sĩ phụ trách | ID hàng đợi | `200 OK` | Ký bù thành công, sinh mã băm SHA-256 64 ký tự |
| `/api/visits/:visitId/emr/:versionId` | PUT | Bác sĩ phụ trách | Cố tình sửa EMR sau ký | `400 Bad Request` | Chặn sửa EMR đã ký: `EMR_VERSION_LOCKED_CANNOT_UPDATE` (AT-23) |
| `/api/visits/:visitId/emr/:versionId/addenda` | POST | Bác sĩ phụ trách | Nội dung + Lý do đính chính | `201 Created` | Thêm phụ lục đính chính EMR thành công (AT-23) |
| `/api/visits/:visitId/consents/:id/sign` | POST | Bác sĩ / Bệnh nhân | Họ tên người ký | `200 OK` | Ký giấy cam kết điều trị |
| `/api/visits/:visitId/consents/:id/revoke` | POST | Bác sĩ / Bệnh nhân | Lý do rút đồng thuận | `200 OK` | Rút đồng thuận: Giữ thủ thuật đã làm, hủy thủ thuật chờ (AT-06) |
| `/api/visits/:visitId/services/:id/complete`| POST | Bác sĩ phụ trách | Chốt hoàn thành thủ thuật | `200 OK` | Hoàn thành dịch vụ, tạo `ServiceCompletionEvents` |
| `/api/visits/:visitId/services/:id/complete`| POST | Bác sĩ phụ trách | Gọi lặp chốt lần 2 | `409 Conflict` | Chặn chốt lặp: `SERVICE_ALREADY_COMPLETED` (AT-18) |

---

## 5. Danh sách Tài khoản Kiểm thử Đã Xác minh (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu mẫu | IsApprover | Quyền hạn kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin1234@` | `false` | Xem toàn bộ, quản trị người dùng, phân quyền, xem audit log, quản trị danh mục |
| **Tiếp nhận** | `receptionist` | `Receptionist1234@` | `false` | Đăng ký bệnh nhân, đặt lịch, tiếp nhận lượt khám, thu ngân |
| **Bác sĩ** | `doctor` | `Doctor1234@` | `false` | Khám, EMR, sơ đồ răng, ký số, kê đơn, cận lâm sàng, chốt dịch vụ; kiểm soát quan hệ điều trị |
| **Kế toán** | `accountant` | `Accountant1234@` | `false` | Lập hóa đơn, chứng từ, đối soát; xem danh mục giá dịch vụ |
| **Kế toán duyệt** | `approver` | `Approver1234@` | `true` | Phê duyệt phiên bản giá dịch vụ (Maker-Checker), duyệt chứng từ kế toán |
| **Quản lý kho** | `warehouse` | `WarehouseManager1234@` | `false` | Nhập xuất tồn, lô, hạn dùng, tiệt trùng, labo; xem danh mục |

---

## 6. Ma trận Tiến độ Triển khai 12 Phân hệ Nghiệp vụ

| STT | Phân hệ (Module) | Schema CSDL | Backend API | Giao diện UI | Trạng thái nghiệm thu |
| :---: | :--- | :--- :--- | :---: | :---: | :--- |
| **1** | **Người dùng, Phân quyền & Audit** | Đã tạo (99 bảng) | Đã xong (Auth, Users, Audit) | Đã xong (Login, Dashboard, Users) | **HOÀN THÀNH (100%)** |
| **2** | **Danh mục & Cấu hình có phiên bản** | Đã tạo | Đã xong (Services, Prices, Rooms, Config) | Đã xong (Services, Prices, Rooms) | **HOÀN THÀNH (100%)** |
| **3** | **Quản lý Bệnh nhân** | Đã tạo | Đã xong (Patients, Allergies, Medical History) | Đã xong (Đăng ký, cảnh báo SĐT, chi tiết) | **HOÀN THÀNH (100%)** |
| **4** | **Lịch hẹn & Lượt khám (Visits)** | Đã tạo | Đã xong (Appointments, Visits, State Machine) | Đã xong (Tiếp nhận, gán Bác sĩ, đổi trạng thái) | **HOÀN THÀNH (100%)** |
| **5** | **EMR, Sơ đồ răng, Kế hoạch & Đồng thuận** | Đã tạo | Đã xong (EMR, ToothChart, Consents, Addenda) | Đã xong (Sơ đồ răng FDI, Ký số, Phụ lục, Hàng đợi ký) | **HOÀN THÀNH (100%)** |
| **6** | **Thanh toán, Thu ngân & Công nợ** | Đã tạo | Chuẩn bị triển khai | Chuẩn bị triển khai | Kế hoạch tiếp theo (AT-01, AT-02, AT-15, AT-20) |
| **7** | **Kho thuốc, Vật tư & Implant** | Đã tạo | Chờ triển khai | Chờ triển khai | Kế hoạch tiếp theo (AT-07, AT-08, AT-12) |
| **8** | **Kế toán & Ca thu ngân** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **9** | **Bảo lãnh BHTM** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **10** | **Tiệt trùng, Labo & Bảo hành** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **11** | **Hoa hồng & Nhân sự** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **12** | **Tài sản & Đối soát cuối ngày** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |

---

## 7. Lịch sử Commit Git

* `4d3dc81`: `module3-4: ho so benh nhan AT-05, tiep nhan luot kham, phan cong bac si AT-17 va bao cao Test.md`
* `a1b0608`: `module2: trien khai danh muc dich vu, phong ghe, bang gia phien ban va bao cao test`
* `6e712dd`: `module1: trien khai xac thuc JWT, phan quyen 5 role, audit log va quan ly nguoi dung`
* `3892f62`: `bat dau dung`
* `dc7b149`: `setup: tao moi truong local va schema nha khoa`
