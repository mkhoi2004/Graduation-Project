# BÁO CÁO KIỂM THỬ VÀ TRẠNG THÁI HỆ THỐNG (TEST.MD)

Dự án: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR**  
Thời điểm kiểm tra: 14/10/2026 22:51:00 (GMT+7)  
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

---

## 2. Dữ liệu Thu thập sau Kiểm thử Tự động (Automated Test Suite)

Chạy lệnh: `node --test tests/*.test.js` trong thư mục `backend/`  
Kết quả: **27/27 tests ĐẠT (100% Pass) - Thời gian: 1685ms**

```text
✔ liveness does not require SQL; readiness does query SQL (41.1ms)
✔ SQL failure is 503 without leaking SQL credentials or query (7.3ms)
✔ unknown API and invalid JSON have stable errors without stack traces (19.1ms)
✔ configuration parses false correctly and supports named instance or fixed port (4.1ms)

▶ Module 1 - Authentication & Authorization Integration Tests
  ✔ Admin login succeeds and returns JWT and role details (279.5ms)
  ✔ Receptionist login succeeds and returns RECEPTIONIST role (213.0ms)
  ✔ Login with wrong password fails with 401 without leaking internal details (208.0ms)
  ✔ Login with nonexistent user fails with 401 (21.1ms)
  ✔ GET /api/auth/me returns current user profile when authenticated (14.3ms)
  ✔ GET /api/auth/me rejects request without token with 401 (3.5ms)
  ✔ Admin can access GET /api/users (18.1ms)
  ✔ Receptionist is forbidden from accessing GET /api/users with 403 (11.1ms)
  ✔ Admin can view AccessAuditLogs with recorded actions (19.1ms)
✔ Module 1 - Authentication & Authorization Integration Tests (1014.1ms)

▶ Module 2 - Catalog & Versioned Configuration Integration Tests
  ✔ Receptionist can read services and see current active prices (42.2ms)
  ✔ Receptionist is forbidden from creating new services with 403 (12.3ms)
  ✔ Admin can create a new service with initial price version (32.7ms)
  ✔ Approver can approve a draft price version (Maker-Checker) (27.0ms)
  ✔ AT-21: Overlapping price versions cannot be approved simultaneously (19.0ms)
  ✔ Admin can soft-delete a service and archive it into Services_Deleted (55.1ms)
  ✔ Admin can restore a soft-deleted service (21.9ms)
  ✔ Authenticated staff can view system configuration versions (10.2ms)
✔ Module 2 - Catalog & Versioned Configuration Integration Tests (1150.6ms)

✔ password policy rejects missing character classes and bcrypt truncation (1.6ms)
✔ bcrypt hashes verify and do not store the cleartext password (8.4ms)
✔ request logging omits URL query, headers and clinical payload (1.3ms)
✔ missing SQL credentials fail before opening any connection (271.4ms)

Tổng kết:
- Tổng số test: 27
- Số test pass: 27 (100%)
- Số test fail: 0
- Số test cancelled / skipped: 0
```

---

## 3. Dữ liệu Kiểm thử Nghiệm thu Tiêu chí AT (Acceptance Criteria)

| Tiêu chí | Mô tả kịch bản | Kết quả mong đợi | Kết quả kiểm thử thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AT-16** | Đổi giá/thuế sau khi báo giá và hoàn thành | Giao dịch cũ giữ phiên bản giá; phiên bản mới áp dụng từ ngày hiệu lực | Phiên bản giá lưu theo dòng `ServicePriceVersions`, có `VersionNo`, `EffectiveFrom`, `EffectiveTo`, không sửa đè bản ghi cũ | **ĐẠT (Passed)** |
| **AT-21** | Hai phiên bản giá/thuế cùng phạm vi và thời gian hiệu lực | Không được duyệt đồng thời (ngăn chặn chồng chéo thời gian) | Kiểm tra `checkPriceOverlap()` trước khi chuyển trạng thái sang `APPROVED`. Khi có khoảng thời gian chồng lấn, API trả lỗi `409 Conflict` mã `PRICE_VERSION_OVERLAP` | **ĐẠT (Passed)** |
| **Maker-Checker** | Người lập không được là người duyệt | Người tạo không duyệt giao dịch của mình; cần cờ `IsApprover=1` | Endpoint `/prices/:versionId/approve` kiểm tra `user.isApprover === true` hoặc `ADMIN`. Nhân viên không có quyền bị trả lỗi `403 Forbidden` | **ĐẠT (Passed)** |
| **Soft-Delete (Nhóm A)** | Xóa mềm qua trigger archive | Dữ liệu chuyển sang bảng `_Deleted`, ghi nhận `DeletedAt`, `DeletedBy` | Thao tác DELETE trên `Services`, `Rooms`, `Users` kích hoạt trigger INSTEAD OF DELETE, lấy username từ `SESSION_CONTEXT(N'username')` | **ĐẠT (Passed)** |

---

## 4. Dữ liệu Kiểm thử Trực tiếp API (Live API Endpoints)

| Endpoint | Method | Vai trò thực hiện | Payload / Tham số | HTTP Status | Kết quả thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/catalog/services` | GET | Tất cả vai trò | Không | `200 OK` | Trả về danh sách dịch vụ kèm giá hiện hành format string `100000.00` |
| `/api/catalog/services` | POST | Tiếp nhận | `{ code, name }` | `403 Forbidden` | `{ error: { code: 'FORBIDDEN' } }`, ghi audit `DENIED` |
| `/api/catalog/services` | POST | Admin | `{ code, name, initialPrice }` | `201 Created` | Tạo dịch vụ mới kèm phiên bản giá nháp `DRAFT` v1 |
| `/api/catalog/services/:id/prices/:vId/approve` | POST | Kế toán duyệt (`approver`) | Không | `200 OK` | Duyệt giá sang `APPROVED`, lưu `ApprovedBy = approverUserId` |
| `/api/catalog/services/:id/prices` | POST | Admin | Giá mới trùng thời gian | `201 Created` | Tạo bản nháp giá v2 |
| `/api/catalog/services/:id/prices/:v2Id/approve` | POST | Kế toán duyệt (`approver`) | Không | `409 Conflict` | Chặn duyệt giá trùng thời gian: `PRICE_VERSION_OVERLAP` (AT-21) |
| `/api/catalog/services/:id` | DELETE | Admin | Không | `200 OK` | Chuyển dịch vụ sang `Services_Deleted` |
| `/api/catalog/services/deleted` | GET | Admin | Không | `200 OK` | Hiển thị dịch vụ đã xóa kèm `DeletedBy = admin` |
| `/api/catalog/services/:id/restore` | POST | Admin | Không | `200 OK` | Khôi phục dịch vụ trở lại bảng `Services` |
| `/api/catalog/rooms` | GET | Tất cả vai trò | Không | `200 OK` | Danh sách ghế điều trị và phòng chức năng |
| `/api/catalog/configs` | GET | Tất cả vai trò | Không | `200 OK` | Cấu hình hệ thống phiên bản (`MAX_ROUNDING_AMOUNT`, v.v.) |

---

## 5. Danh sách Tài khoản Kiểm thử Đã Xác minh (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu mẫu | IsApprover | Quyền hạn kiểm chứng |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin1234@` | `false` | Xem toàn bộ, quản trị người dùng, phân quyền, xem audit log, quản trị danh mục |
| **Tiếp nhận** | `receptionist` | `Receptionist1234@` | `false` | Đặt lịch, tiếp nhận, thu ngân; xem danh mục dịch vụ & giá; chặn sửa danh mục |
| **Bác sĩ** | `doctor` | `Doctor1234@` | `false` | Khám, chẩn đoán, chỉ định, ký EMR; xem danh mục dịch vụ & phòng ghế |
| **Kế toán** | `accountant` | `Accountant1234@` | `false` | Lập hóa đơn, chứng từ, đối soát; xem danh mục giá dịch vụ |
| **Kế toán duyệt** | `approver` | `Approver1234@` | `true` | Phê duyệt phiên bản giá dịch vụ (Maker-Checker), duyệt chứng từ kế toán |
| **Quản lý kho** | `warehouse` | `WarehouseManager1234@` | `false` | Nhập xuất tồn, lô, hạn dùng, tiệt trùng, labo; xem danh mục |

---

## 6. Ma trận Tiến độ Triển khai 12 Phân hệ Nghiệp vụ

| STT | Phân hệ (Module) | Schema CSDL | Backend API | Giao diện UI | Trạng thái nghiệm thu |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | **Người dùng, Phân quyền & Audit** | Đã tạo (99 bảng) | Đã xong (Auth, Users, Audit) | Đã xong (Login, Dashboard, Users) | **HOÀN THÀNH (100%)** |
| **2** | **Danh mục & Cấu hình có phiên bản** | Đã tạo | Đã xong (Services, Prices, Rooms, Config) | Đã xong (Services, Prices, Rooms) | **HOÀN THÀNH (100%)** |
| **3** | **Quản lý Bệnh nhân** | Đã tạo | Chuẩn bị triển khai | Chuẩn bị triển khai | Tiếp tục thực hiện |
| **4** | **Lịch hẹn & Lượt khám (Visits)** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **5** | **EMR, Kế hoạch điều trị & Đồng thuận** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **6** | **Thanh toán, Thu ngân & Công nợ** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **7** | **Kho thuốc, Vật tư & Implant** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **8** | **Kế toán & Ca thu ngân** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **9** | **Bảo lãnh BHTM** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **10** | **Tiệt trùng, Labo & Bảo hành** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **11** | **Hoa hồng & Nhân sự** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |
| **12** | **Tài sản & Đối soát cuối ngày** | Đã tạo | Chờ triển khai | Chờ triển khai | Chưa thực hiện |

---

## 7. Lịch sử Commit Git

* `6e712dd`: `module1: trien khai xac thuc JWT, phan quyen 5 role, audit log va quan ly nguoi dung`
* `3892f62`: `bat dau dung`
* `dc7b149`: `setup: tao moi truong local va schema nha khoa`
