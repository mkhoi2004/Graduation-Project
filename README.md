# Hệ Thống Quản Lý Phòng Khám Nha Khoa ERP & EMR

Dự án tốt nghiệp: **Hệ thống Quản lý Phòng khám Nha khoa Tích hợp ERP & EMR chuyên sâu**, xây dựng bám sát chuẩn nghiệp vụ phòng khám nha khoa quy mô vừa và chuỗi (v14), tuân thủ đầy đủ 24 Tiêu chuẩn Nghiệm thu Chấp thuận (**AT-01** đến **AT-24**).

* **Công nghệ Backend:** Node.js (ESM), Express 5, Sequelize ORM, SQL Server 2022 Express, JWT, Decimal.js, bcrypt.
* **Công nghệ Frontend:** React 19, Vite 7, Ant Design, TailwindCSS, React Router v7, Axios.
* **Cơ sở dữ liệu:** SQL Server 2022 (99 bảng dữ liệu, ràng buộc toàn vẹn, Soft-delete trigger archive, Maker-Checker).
* **Kiểm thử tự động:** 96/96 automated tests đạt 100% PASS trên Node test runner tích hợp.

---

## 🚀 Hướng Dẫn Chạy Nhanh (Quick Start)

### 1. Yêu cầu môi trường
* **Hệ điều hành:** Windows 10/11 (Local)
* **Node.js:** Phiên bản `>= 20.x` (khuyến nghị Node 22+ hoặc 24+)
* **Cơ sở dữ liệu:** Microsoft SQL Server (hoặc SQL Server Express 2022) chạy cổng `1433` (TCP/IP Enabled).

---

### 2. Cài đặt thư viện dependencies

Mở PowerShell tại thư mục gốc dự án (`Graduation-Project`), chạy:

```powershell
# Cài đặt toàn bộ dependencies cho Root, Backend và Frontend
npm run install:all
```

---

### 3. Cấu hình biến môi trường (`.env`)

Tạo hoặc kiểm tra file `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_local_dental_clinic_2026
JWT_EXPIRES_IN=24h

# Cấu hình SQL Server Local
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=Graduation Project
DB_USER=sa
DB_PASSWORD=YourPassword123@
```

*(Lưu ý: Thay `DB_USER` và `DB_PASSWORD` bằng tài khoản SQL Server Authentication của bạn).*

---

### 4. Khởi tạo Cơ sở dữ liệu & Dữ liệu mẫu (Seed)

Nếu bạn vừa cài mới database, chạy các lệnh sau trong thư mục `backend`:

```powershell
cd backend
npm run db:check    # Kiểm tra kết nối tới SQL Server
npm run seed        # Khởi tạo 5 Roles, Chi nhánh, Dịch vụ mẫu và 6 Tài khoản demo
cd ..
```

---

### 5. Khởi động ứng dụng

Mở **2 cửa sổ PowerShell** riêng biệt:

#### 🔹 Terminal 1: Khởi động Backend API (Port 5000)
```powershell
npm run dev:backend
```
> API sẵn sàng tại: `http://127.0.0.1:5000`  
> Kiểm tra sức khỏe hệ thống: `http://127.0.0.1:5000/api/health`

#### 🔹 Terminal 2: Khởi động Giao diện Frontend (Port 5173)
```powershell
npm run dev:frontend
```
> Truy cập giao diện ứng dụng tại: **[http://localhost:5173](http://localhost:5173)**

---

## 🔑 Danh Sách Tài Khoản Đăng Nhập Mẫu (Demo Accounts)

Tất cả tài khoản đều đã được tạo sẵn qua script Seed:

| Vai trò (Role) | Tên đăng nhập | Mật khẩu | Quyền hạn & Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `Admin1234@` | Toàn quyền hệ thống, quản lý người dùng, phân quyền RBAC, xem nhật ký truy cập Audit logs. |
| **Tiếp nhận (Receptionist)** | `receptionist` | `Receptionist1234@` | Đón tiếp, tạo hồ sơ bệnh nhân, đặt hẹn, tiếp nhận lượt khám, mở ca thu ngân, thu viện phí, cấn cọc. |
| **Bác sĩ (Doctor)** | `doctor` | `Doctor1234@` | Khám lâm sàng, ghi bệnh án EMR, sơ đồ răng FDI 32 răng, ký số chữ ký điện tử, chỉ định Labo, kê đơn. |
| **Kế toán (Accountant)** | `accountant` | `Accountant1234@` | Quản lý ca thu ngân, kiểm đếm chênh lệch, lập hóa đơn, hạch toán sổ cái, tính hoa hồng bác sĩ. |
| **Kế toán trưởng (Approver)** | `approver` | `Approver1234@` | Phê duyệt giảm giá/hoàn tiền, duyệt phân xử lệch tiền (**AT-09**), khóa sổ kế toán (**AT-10**), duyệt hoàn tiền sau khóa sổ (**AT-11**). |
| **Quản lý kho (Warehouse)** | `warehouse` | `WarehouseManager1234@` | Nhập/xuất kho thuốc theo hạn dùng (**FEFO**), thu hồi lô khẩn cấp (**AT-08**), quản lý trụ Implant theo Serial (**AT-12**), kiểm định thiết bị. |

---

## 🧪 Chạy Kiểm Thử Tự Động (Automated Tests)

Hệ thống tích hợp bộ kiểm thử tự động toàn diện kiểm chứng logic nghiệp vụ và 24 tiêu chí nghiệm thu:

```powershell
# Chạy toàn bộ 96 test cases tự động
cd backend
npm test
```

**Kết quả kiểm thử thực tế:**
```text
✔ Module 1 - Authentication & Authorization Integration Tests (9/9 pass)
✔ Module 2 - Catalog & Versioned Configuration Integration Tests (7/7 pass)
✔ Module 3-4 - Patient Management, Appointments & Visits Tests (8/8 pass)
✔ Module 5 - Clinical EMR, Consents, SignQueue & Immutability Tests (7/7 pass)
✔ Module 6 - Patient Billing, Race Prevention & Maker-Checker Tests (8/8 pass)
✔ Module 7 - Inventory, FEFO, Lot Recall & Implant Serial Tests (4/4 pass)
✔ Module 8 - Accounting, Cash Shifts, Period Closing & Ledger Tests (3/3 pass)
✔ Module 9 - Commercial Health Insurance (BHTM) Adjudication Tests (6/6 pass)
✔ Module 10 - Sterilization, Lab Orders, Warranties & Incidents Tests (6/6 pass)
✔ Module 11 - HR, Commissions & Payroll with Negative Adjustments Tests (9/9 pass)
✔ Module 12 - Assets Maintenance, Daily Reconciliation, AT-11 & AT-19 Tests (6/6 pass)
✔ Security, bcrypt, logging & sanity tests (4/4 pass)

Total Tests: 96 | Passed: 96 (100%) | Failed: 0
```

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
Graduation-Project/
├── database/                    # Script SQL khởi tạo 99 bảng, migration và seeds
│   ├── 01_migrations/           # Migration quản lý phiên bản DDL
│   ├── 02_tables/               # Định nghĩa schema 12 module nghiệp vụ
│   ├── 03_seeds/                # Dữ liệu hạt giống ban đầu
│   └── bootstrap.sql            # Script khởi tạo cơ sở dữ liệu hoàn chỉnh
├── backend/                     # Mã nguồn Backend API (Node.js ESM + Express)
│   ├── src/
│   │   ├── config/              # Cấu hình môi trường, DB pool Sequelize
│   │   ├── controllers/         # Bộ điều hướng API theo từng Module
│   │   ├── middlewares/         # Middleware xác thực JWT, RBAC, Rate-limit, Audit
│   │   ├── models/              # Định nghĩa Sequelize Models cho 99 bảng
│   │   ├── repositories/        # Tầng xử lý nghiệp vụ, transactions và SQL locks
│   │   ├── routes/              # Đăng ký các endpoints REST API
│   │   └── services/            # Logic dịch vụ chuyên sâu
│   └── tests/                   # 12 file test tự động kiểm thử tích hợp
├── frontend/                    # Mã nguồn Giao diện (React 19 + Vite 7 + Ant Design)
│   ├── src/
│   │   ├── components/          # Các components giao diện dùng chung
│   │   ├── context/             # Auth Context quản lý trạng thái đăng nhập
│   │   ├── layouts/             # Khung điều hướng Sidebar, Header, Profile
│   │   ├── pages/               # 12 trang nghiệp vụ tương ứng các Module
│   │   ├── routes/              # Điều hướng và bảo vệ route theo quyền (RBAC)
│   │   └── services/            # Axios API Client kết nối Backend
│   └── package.json
├── QUY_TRINH_VAN_HANH_THEO_ROLE.md # Hướng dẫn chi tiết quy trình thao tác nghiệp vụ theo 5 role
├── Test.md                      # Báo cáo chi tiết 118 bài test và bảng nghiệm thu AT
└── README.md                    # Tài liệu hướng dẫn cài đặt và vận hành
```

---

## 🌟 Tóm Tắt 12 Phân Hệ Đã Hoàn Thành (100%)

1. **Phân hệ 1 - Xác thực & Phân quyền (RBAC):** Đăng nhập an toàn, cơ chế Maker-Checker với cờ `IsApprover`, xóa mềm dữ liệu nhóm A và lưu vết nhật ký `AccessAuditLogs`.
2. **Phân hệ 2 - Danh mục & Bảng giá phiên bản:** Quản lý dịch vụ, phòng ghế, áp dụng giá theo khoảng thời gian hiệu lực (**AT-16**), chống chồng chéo thời gian duyệt giá (**AT-21**).
3. **Phân hệ 3 - Quản lý Bệnh nhân:** Quản lý hồ sơ, tiền sử dị ứng, cảnh báo dùng chung số điện thoại (**AT-05**).
4. **Phân hệ 4 - Lịch hẹn & Lượt khám (Visits):** Tiếp nhận bệnh nhân, máy trạng thái lượt khám, phân công bác sĩ, kiểm soát quan hệ điều trị (**AT-17**).
5. **Phân hệ 5 - Bệnh án điện tử EMR & Sơ đồ răng:** Sơ đồ răng FDI 32 răng, bất biến nội dung sau ký số (**AT-23**), phụ lục `EmrAddenda`, rút đồng thuận thủ thuật (**AT-06**), hàng đợi ký số dự phòng sự cố mạng (**AT-13**), chốt dịch vụ không nhân đôi (**AT-18**).
6. **Phân hệ 6 - Thu ngân, Viện phí & Công nợ:** Hóa đơn viện phí bất biến (**AT-01**), khóa chặn thu vượt nợ (**AT-02**), cấn cọc đồng thời an toàn (**AT-15**), kiểm soát tiền tệ và Maker-Checker (**AT-20**).
7. **Phân hệ 7 - Kho Dược, Vật tư & Implant:** Xuất kho tự động ưu tiên hạn dùng FEFO (**AT-07**), thu hồi lô khẩn cấp & truy vết bệnh nhân (**AT-08**), quản lý trụ Implant theo Serial chống tái dùng (**AT-12**).
8. **Phân hệ 8 - Kế toán & Ca thu ngân:** Quản lý ca thu ngân, bắt buộc giải trình lệch tiền và Maker-Checker (**AT-09**), khóa sổ kỳ kế toán & chặn ghi lùi ngày (**AT-10**), sổ nhật ký chung hạch toán kép cân bằng.
9. **Phân hệ 9 - Bảo lãnh Bảo hiểm Thương mại (BHTM):** Chống nộp lặp hồ sơ claim (**AT-14**), xử lý duyệt thiếu không tự ý truy thu bệnh nhân (**AT-04**), theo dõi công nợ BHTM chờ thanh toán (**AT-03**).
10. **Phân hệ 10 - Tiệt trùng, Labo & Bảo hành:** Quản lý chu kỳ tiệt trùng, cách ly gói dụng cụ hỏng/quá hạn, quy trình ngoại lệ cấp cứu (**AT-22**), quản lý đơn gia công Labo & làm lại (Rework), kích hoạt thẻ bảo hành nha khoa.
11. **Phân hệ 11 - Hoa hồng & Bảng lương:** Không tính hoa hồng trùng cho cùng dòng tiền, hoàn tiền tạo điều chỉnh số âm liên kết bản gốc, khóa bảng lương bất biến `LOCKED`, phân quyền bác sĩ chỉ xem hoa hồng của chính mình.
12. **Phân hệ 12 - Tài sản & Đối soát Cuối ngày:** Tự động phát hiện 5 nguồn bất thường, phân xử sai lệch, hoàn tiền sau khóa sổ vào kỳ mở (**AT-11**), kiểm tra toàn vẹn mã băm chữ ký số EMR & khóa ngoại (**AT-19**), xuất Báo cáo Đối soát Tổng hợp Cuối ngày chuẩn v14 (**AT-24**).

---

> 📖 *Để xem chi tiết toàn bộ số liệu kiểm thử và kết quả đo đạc thực tế trên CSDL, vui lòng tham khảo tài liệu [Test.md](Test.md).*  
> 📘 *Để xem hướng dẫn thao tác chi tiết từng bước cho từng nhân sự (Lễ tân, Bác sĩ, Kho, Kế toán, Admin), vui lòng tham khảo [QUY_TRINH_VAN_HANH_THEO_ROLE.md](QUY_TRINH_VAN_HANH_THEO_ROLE.md).*
