# Graduation Project — ERP & EMR nha khoa

Nền tảng phát triển local theo [Prompt_Project](Prompt_Project.txt) và [Quy trình v14](Quy_trinh_NhaKhoa_TongHop_v14.md). Backend Node.js/Express, SQL Server, frontend React/Vite/Ant Design. Không Docker, CI/CD hay cloud. Làm trực tiếp trên nhánh `main`.

## Trạng thái hiện tại

Đã tạo cấu trúc dự án, cấu hình, health API, giao diện kiểm tra môi trường, SQL nền tảng và script seed 5 vai trò/6 tài khoản. **Chưa triển khai đăng nhập và 12 module nghiệp vụ; chưa nghiệm thu AT-01 đến AT-24.**

**Máy hiện tại:** người dùng đã chọn `DESKTOP-F5CFA0D\SQLEXPRESS` thay `ADMIN` trong tài liệu; dùng TCP `1433`, không cần bật Browser khi đã chỉ định cổng. Ngày 14/10/2026, 60 bảng cũ trong `[Graduation Project]` đã được xóa theo yêu cầu và thay bằng 99 bảng mới cho 12 module. Schema và seed đã được kiểm chứng trực tiếp. Backend chưa có SQL credentials trong `.env`, vì vậy readiness của API vẫn báo chưa sẵn sàng cho tới khi điền tài khoản SQL Authentication.

## Chạy ngay API và giao diện

Yêu cầu Node.js 22.12+ (máy hiện tại 24.21.0), npm, SQL Server và SSMS. Chạy trong PowerShell tại thư mục repository:

```powershell
npm run install:all
npm run setup
```

`setup` tạo `backend/.env` với JWT secret ngẫu nhiên, không ghi đè file đã có. Không commit `.env` và không gửi mật khẩu vào chat. Môi trường API/giao diện vẫn chạy được khi chưa cấu hình SQL.

Terminal thứ nhất:

```powershell
npm run dev:backend
```

Terminal thứ hai:

```powershell
npm run dev:frontend
```

Mở [giao diện local](http://127.0.0.1:5173). API: [health](http://127.0.0.1:5000/api/health). Hai tiến trình chỉ bind loopback. Dừng từng terminal bằng Ctrl+C. Nếu đổi PORT backend thì đổi cả proxy trong `frontend/vite.config.js`.

## Chuẩn bị hoặc tạo lại SQL

Xem [database/README.md](database/README.md) trước khi chạy DDL.

1. Kết nối SSMS tới `DESKTOP-F5CFA0D\SQLEXPRESS`. Kiểm tra TCP/IP bật; cổng TCP hiện tại là 1433. Nếu dùng named instance bằng cách để trống DB_PORT, SQL Server Browser cần hoạt động.
2. `database/bootstrap.sql` nhận database trống hoặc schema cùng phiên bản; schema lạ bị từ chối. Chạy từ thư mục repository bằng `sqlcmd -S "localhost,1433" -E -C -b -i .\database\bootstrap.sql`.
3. `database/reset-tables.sql` là lệnh phá hủy có chủ đích: xóa toàn bộ bảng người dùng trong đúng `[Graduation Project]`, giữ database/quyền cấp database, rồi chạy bootstrap và seed. Chỉ dùng khi đã chủ động chấp nhận mất dữ liệu hiện tại.
4. Điền `DB_USER` và `DB_PASSWORD` của SQL login được cấp cho project vào `backend/.env`. `DB_INSTANCE=SQLEXPRESS`, `DB_PORT=1433`, `DB_NAME=Graduation Project`. Đây là SQL Authentication, không phải Windows account. Script không tạo login hoặc thay đổi chế độ xác thực SQL Server.
5. Sau khi quyền truy cập đã sẵn sàng:

```powershell
cd backend
npm run db:check
npm run seed
npm run seed
npm run dev
```

Seed dùng transaction/khóa, hash bcrypt; chạy lại không tạo trùng và không reset tài khoản cũ. Quyền SQL tối thiểu cho seed: SELECT/INSERT trên Roles, Branches, Users và SELECT schema nền tảng. Lệnh DDL cần tài khoản cài schema riêng. Không cần cấp backend `sysadmin`.

Tài khoản mẫu chuẩn bị cho Module 1 (chưa có trang đăng nhập):

- Admin: `admin` / `Admin1234@`.
- Tiếp nhận: `receptionist` / `Receptionist1234@`.
- Bác sĩ: `doctor` / `Doctor1234@`.
- Kế toán: `accountant` / `Accountant1234@`.
- Kế toán duyệt: `approver` / `Approver1234@`, cùng role ACCOUNTANT, `IsApprover=1`.
- Kho: `warehouse` / `WarehouseManager1234@`.

Seed hiện có một chi nhánh, hai phòng/ghế, hai dịch vụ kèm giá, một kho/vật tư/lô/tồn, năm tài khoản kế toán mẫu và hai cấu hình có phiên bản. Không có dữ liệu bệnh nhân mẫu hoặc thật.

## Kiểm thử

```powershell
npm test
npm run build
npm run db:check
```

`npm test`: HTTP liveness/readiness, cấu hình, lỗi không lộ secrets, password/bcrypt và log. `db:check` trả exit code 1 nếu thiếu credentials, kết nối lỗi hoặc thiếu schema; đó không phải bằng chứng DB đã sẵn sàng.

Kiểm thử SQL trên database tạm (cần sqlcmd và quyền tạo database bằng Windows Authentication):

```powershell
.\scripts\test-database.ps1
```

Script tạo tên ngẫu nhiên, kiểm thử DDL/trigger rồi xóa **đúng database vừa tạo**; không đụng `[Graduation Project]`. Nếu chính sách PowerShell không cho chạy script, xem nội dung trước và dùng terminal được phép theo chính sách máy.

Kiểm tra nhanh Postman/Thunder Client dùng [docs/local-smoke.http](docs/local-smoke.http): `GET /api/health` → 200; `GET /api/health/ready` → 200 nếu SQL/schema sẵn sàng, 503 nếu chưa; route không tồn tại → 404 JSON. Trang frontend cũng truy vấn hai health endpoint qua Vite proxy.

## Cấu trúc

```text
database/             bootstrap, bảng, archive, trigger, index và test SQL
backend/src/          config, routes, controllers, services, middlewares,
                      validators, scripts; models/repositories/utils/jobs chờ module
backend/tests/        kiểm thử nền tảng
frontend/src/         components, pages, services, routes, hooks, styles;
                      layouts/context/utils chờ module
docs/                 thiết kế, ERD, lộ trình và kết quả kiểm chứng
scripts/              setup local và kiểm thử SQL tách biệt
```

Đọc [thiết kế & ERD](docs/superpowers/specs/2026-10-14-local-foundation-design.md), [kế hoạch](docs/superpowers/plans/2026-10-14-local-foundation.md) và [kết quả kiểm chứng](docs/verification.md). Hai tài liệu nguồn ở gốc là nguồn đối chiếu, không sao chép thành bản dễ lệch.

## Quy ước phát triển tiếp

- Mỗi module có model/repository/service/controller/route riêng, page riêng; tên file kebab-case. DB schema quản lý bằng SQL, không Sequelize sync force/alter.
- Tiền dùng chuỗi API + decimal.js + DECIMAL(18,2); không Number/parseFloat cho tính tiền. Tham số chuyên môn/kế toán lưu theo phiên bản, không hard-code.
- Quyền kiểm tra phía server: role, chi nhánh, mục đích, quan hệ điều trị, trạng thái; frontend không thay thế quyền server. Admin đọc theo Prompt có audit, không ký/chốt/duyệt thay người có nghiệp vụ.
- Nhóm A archive bằng trigger; nhóm B bất biến sau ký/chốt/ghi sổ, sửa qua sự kiện mới. Không triển khai DELETE nghiệp vụ trước các guard tương ứng.
- Idempotency và khóa cạnh tranh phải được triển khai trong transaction trước khi có chức năng thu tiền/kho. Bảng IdempotencyKeys hiện chỉ là nền schema, chưa có middleware xử lý.
- Dependencies được pin và có lockfile. Sequelize 6 dùng override uuid 11.1.1 để xử lý cảnh báo upstream; tedious đã cập nhật dòng 20. Không dùng `npm audit fix --force` để tự hạ Sequelize.

Tài liệu kỹ thuật đã đối chiếu: [Vite](https://vite.dev/guide/), [Sequelize MSSQL](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/), [SQL SESSION_CONTEXT](https://learn.microsoft.com/en-us/sql/relational-databases/system-stored-procedures/sp-set-session-context-transact-sql).
