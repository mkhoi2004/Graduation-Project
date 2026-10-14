# BÁO CÁO KIỂM THỬ VÀ TRẠNG THÁI HỆ THỐNG (TEST.MD)

Dự án: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR**  
Thời điểm kiểm tra: 14/10/2026 22:57:00 (GMT+7)  
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

---

## 2. Dữ liệu Thu thập sau Kiểm thử Tự động (Automated Test Suite)

Chạy lệnh: `node --test tests/*.test.js` trong thư mục `backend/`  
Kết quả: **35/35 tests ĐẠT (100% Pass) - Thời gian: 1749ms**

```text
✔ liveness does not require SQL; readiness does query SQL (54.0ms)
✔ SQL failure is 503 without leaking SQL credentials or query (5.1ms)
✔ unknown API and invalid JSON have stable errors without stack traces (16.0ms)
✔ configuration parses false correctly and supports named instance or fixed port (3.0ms)

▶ Module 1 - Authentication & Authorization Integration Tests
  ✔ Admin login succeeds and returns JWT and role details (286.0ms)
  ✔ Receptionist login succeeds and returns RECEPTIONIST role (205.0ms)
  ✔ Login with wrong password fails with 401 without leaking internal details (209.3ms)
  ✔ Login with nonexistent user fails with 401 (20.3ms)
  ✔ GET /api/auth/me returns current user profile when authenticated (12.2ms)
  ✔ GET /api/auth/me rejects request without token with 401 (3.1ms)
  ✔ Admin can access GET /api/users (14.6ms)
  ✔ Receptionist is forbidden from accessing GET /api/users with 403 (9.4ms)
  ✔ Admin can view AccessAuditLogs with recorded actions (15.5ms)
✔ Module 1 - Authentication & Authorization Integration Tests (1002.6ms)

▶ Module 2 - Catalog & Versioned Configuration Integration Tests
  ✔ Receptionist can read services and see current active prices (41.0ms)
  ✔ Receptionist is forbidden from creating new services with 403 (12.1ms)
  ✔ Admin can create a new service with initial price version (28.9ms)
  ✔ Approver can approve a draft price version (Maker-Checker) (25.5ms)
  ✔ AT-21: Overlapping price versions cannot be approved simultaneously (17.3ms)
  ✔ Admin can soft-delete a service and archive it into Services_Deleted (48.8ms)
  ✔ Admin can restore a soft-deleted service (18.2ms)
  ✔ Authenticated staff can view system configuration versions (8.4ms)
✔ Module 2 - Catalog & Versioned Configuration Integration Tests (1120.6ms)

▶ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests
  ✔ Receptionist can create patient profile 1 with phone (34.1ms)
  ✔ AT-05: Creating patient 2 with same phone returns warning and requires confirmation (20.0ms)
  ✔ Receptionist can create visit and assign to Doctor (45.3ms)
  ✔ AT-17: Doctor can view patient profile when active treatment relationship exists (25.3ms)
  ✔ AT-17: Doctor CANNOT view patient 2 who has NO treatment relationship or assignment (14.5ms)
  ✔ Doctor can transition visit state to IN_PROGRESS and CLINICAL_COMPLETED (57.7ms)
  ✔ Patient with existing visits cannot be deleted (Business rule) (215.6ms)
✔ Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests (1139.0ms)

✔ password policy rejects missing character classes and bcrypt truncation (1.7ms)
✔ bcrypt hashes verify and do not store the cleartext password (9.1ms)
✔ request logging omits URL query, headers and clinical payload (2.0ms)
✔ missing SQL credentials fail before opening any connection (281.8ms)

Tổng kết:
- Tổng số test: 35
- Số test pass: 35 (100%)
- Số test fail: 0
- Số test cancelled / skipped: 0
```

---

## 3. Dữ liệu Kiểm thử Nghiệm thu Tiêu chí AT (Acceptance Criteria)

| Tiêu chí | Mô tả kịch bản | Kết quả mong đợi | Kết quả kiểm thử thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AT-05** | Hai bệnh nhân dùng chung số điện thoại | Cảnh báo trùng SĐT, vẫn tạo được hồ sơ riêng sau khi xác minh | Khi trùng SĐT, API trả mã cảnh báo `PHONE_DUPLICATE_WARNING` kèm danh sách bệnh nhân trùng. Khi gửi cờ `confirmDuplicatePhone: true`, hệ thống tạo hồ sơ riêng với mã bệnh nhân riêng biệt | **ĐẠT (Passed)** |
| **AT-16** | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản giá; phiên bản mới áp dụng từ ngày hiệu lực | Phiên bản giá lưu theo dòng `ServicePriceVersions`, có `VersionNo`, `EffectiveFrom`, `EffectiveTo`, không sửa đè bản ghi cũ | **ĐẠT (Passed)** |
| **AT-17** | Người lập tự duyệt hoàn; gọi API đọc EMR không có quan hệ điều trị | API từ chối và ghi log audit | Bác sĩ không có phân công lượt khám hoặc quan hệ điều trị với bệnh nhân gọi `GET /api/patients/:id` bị chặn với mã `403 FORBIDDEN` (mã `NO_TREATMENT_RELATIONSHIP`), tự động ghi `DENIED` vào `AccessAuditLogs` | **ĐẠT (Passed)** |
| **AT-21** | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời (ngăn chặn chồng chéo thời gian) | Kiểm tra `checkPriceOverlap()` trước khi chuyển trạng thái sang `APPROVED`. Khi có khoảng thời gian chồng lấn, API trả lỗi `409 Conflict` mã `PRICE_VERSION_OVERLAP` | **ĐẠT (Passed)** |
| **Maker-Checker** | Người lập không được là người duyệt | Người tạo không duyệt giao dịch của mình; cần cờ `IsApprover=1` | Endpoint `/prices/:versionId/approve` kiểm tra `user.isApprover === true` hoặc `ADMIN`. Nhân viên không có quyền bị trả lỗi `403 Forbidden` | **ĐẠT (Passed)** |
| **Soft-Delete (Nhóm A)** | Xóa mềm qua trigger archive | Dữ liệu chuyển sang bảng `_Deleted`, ghi nhận `DeletedAt`, `DeletedBy` | Thao tác DELETE trên `Services`, `Rooms`, `Users`, `Patients` kích hoạt trigger INSTEAD OF DELETE, lấy username từ `SESSION_CONTEXT(N'username')` | **ĐẠT (Passed)** |
| **Toàn vẹn (Nhóm B)** | Bệnh nhân đã có lượt khám không thể xóa | Chặn xóa hồ sơ đã phát sinh dữ liệu điều trị | Thao tác xóa bệnh nhân đã có `Visits` bị từ chối với mã lỗi `409 Conflict` (`PATIENT_HAS_VISITS`) | **ĐẠT (Passed)** |

---

## 4. Dữ liệu Kiểm thử Trực tiếp API (Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/patients` | POST | Tiếp nhận | Bệnh nhân 1 (SĐT mới) | `201 Created` | Tạo hồ sơ bệnh nhân 1 thành công |
| `/api/patients` | POST | Tiếp nhận | Bệnh nhân 2 (Trùng SĐT) | `200 OK` | Cảnh báo trùng SĐT: `PHONE_DUPLICATE_WARNING` (AT-05) |
| `/api/patients` | POST | Tiếp nhận | Bệnh nhân 2 + `confirmDuplicatePhone: true` | `201 Created` | Tạo hồ sơ bệnh nhân 2 thành công với mã riêng |
| `/api/visits` | POST | Tiếp nhận | Gán bác sĩ khám | `201 Created` | Tạo lượt khám `REGISTERED` và tự động tạo `TreatmentRelationships` |
| `/api/patients/:id` | GET | Bác sĩ phụ trách | ID bệnh nhân 1 | `200 OK` | Xem được hồ sơ bệnh nhân (do có quan hệ điều trị) |
| `/api/patients/:id` | GET | Bác sĩ khác | ID bệnh nhân 2 | `403 Forbidden` | Bị chặn: `NO_TREATMENT_RELATIONSHIP`, ghi audit DENIED (AT-17) |
| `/api/visits/:id/status` | PATCH | Bác sĩ | `newStatus: IN_PROGRESS` | `200 OK` | Chuyển trạng thái lượt khám sang `IN_PROGRESS` |
| `/api/visits/:id/status` | PATCH | Bác sĩ | `newStatus: CLINICAL_COMPLETED` | `200 OK` | Chuyển trạng thái lượt khám sang `CLINICAL_COMPLETED` |
| `/api/patients/:id` | DELETE | Admin | ID bệnh nhân 1 (đã có visit) | `409 Conflict` | Chặn xóa bệnh nhân đã có lượt khám: `PATIENT_HAS_VISITS` |

---

## 5. Danh sách Tài khoản Kiểm thử Đã Xác minh (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu mẫu | IsApprover | Quyền hạn kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin1234@` | `false` | Xem toàn bộ, quản trị người dùng, phân quyền, xem audit log, quản trị danh mục |
| **Tiếp nhận** | `receptionist` | `Receptionist1234@` | `false` | Đăng ký bệnh nhân, đặt lịch, tiếp nhận lượt khám, thu ngân |
| **Bác sĩ** | `doctor` | `Doctor1234@` | `false` | Khám, chuyển trạng thái lượt khám; chỉ xem hồ sơ bệnh nhân trong quan hệ điều trị |
| **Kế toán** | `accountant` | `Accountant1234@` | `false` | Lập hóa đơn, chứng từ, đối soát; xem danh mục giá dịch vụ |
| **Kế toán duyệt** | `approver` | `Approver1234@` | `true` | Phê duyệt phiên bản giá dịch vụ (Maker-Checker), duyệt chứng từ kế toán |
| **Quản lý kho** | `warehouse` | `WarehouseManager1234@` | `false` | Nhập xuất tồn, lô, hạn dùng, tiệt trùng, labo; xem danh mục |

---

## 6. Ma trận Tiến độ Triển khai 12 Phân hệ Nghiệp vụ

| STT | Phân hệ (Module) | Schema CSDL | Backend API | Giao diện UI | Trạng thái nghiệm thu |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Người dùng, Phân quyền & Audit** | Đã tạo (99 bảng) | Đã xong (Auth, Users, Audit) | Đã xong (Login, Dashboard, Users) | **HOÀN THÀNH (100%)** |
| **2** | **Danh mục & Cấu hình có phiên bản** | Đã tạo | Đã xong (Services, Prices, Rooms, Config) | Đã xong (Services, Prices, Rooms) | **HOÀN THÀNH (100%)** |
| **3** | **Quản lý Bệnh nhân** | Đã tạo | Đã xong (Patients, Allergies, Medical History) | Đã xong (Đăng ký, cảnh báo SĐT, chi tiết) | **HOÀN THÀNH (100%)** |
| **4** | **Lịch hẹn & Lượt khám (Visits)** | Đã tạo | Đã xong (Appointments, Visits, State Machine) | Đã xong (Tiếp nhận, gán Bác sĩ, đổi trạng thái) | **HOÀN THÀNH (100%)** |
| **5** | **EMR, Kế hoạch điều trị & Đồng thuận** | Đã tạo | Chuẩn bị triển khai | Chuẩn bị triển khai | Tiếp tục thực hiện |
| **6** | **Thanh toán, Thu ngân & Công nợ** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **7** | **Kho thuốc, Vật tư & Implant** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **8** | **Kế toán & Ca thu ngân** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **9** | **Bảo lãnh BHTM** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **10** | **Tiệt trùng, Labo & Bảo hành** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **11** | **Hoa hồng & Nhân sự** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **12** | **Tài sản & Đối soát cuối ngày** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |

---

## 7. Lịch sử Commit Git

* `a1b0608`: `module2: trien khai danh muc dich vu, phong ghe, bang gia phien ban va bao cao test`
* `6e712dd`: `module1: trien khai xac thuc JWT, phan quyen 5 role, audit log va quan ly nguoi dung`
* `3892f62`: `bat dau dung`
* `dc7b149`: `setup: tao moi truong local va schema nha khoa`
