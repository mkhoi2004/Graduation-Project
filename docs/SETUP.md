# Cài đặt và kiểm tra local

Xem [README ở thư mục gốc](../README.md) để chạy NestJS API và giao diện React trên máy `.\SQLEXPRESS`. Backend và frontend đều dùng TypeScript; không cần .NET SDK.

## SQL Server

Nếu cần dựng lại database `Graduation Project`, chạy `database/001_schema.sql`, `database/002_archive.sql`, rồi `database/003_hardening.sql` bằng `sqlcmd -S '.\SQLEXPRESS' -E -b`. Cơ chế xóa chuyển ảnh bản ghi sang bảng `_Deleted` bằng trigger. API đặt `ActorId` và `DeleteReason` trong cùng transaction với lệnh DELETE, rồi ghi audit trước khi commit.

## Kiểm tra

```powershell
npm --prefix backend test
npm --prefix backend run build
npm --prefix frontend test
npm --prefix frontend run build
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/verify.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/verify_hardening.sql
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/integration.ps1
```

Kiểm thử tích hợp tạo database tạm, chạy NestJS, xác nhận ba role, phân quyền, CRUD bệnh nhân/dịch vụ/lượt khám, rollback người dùng có role sai, và archive/audit; sau đó dọn dữ liệu thử.

## Phạm vi

API/UI hiện có đăng nhập, dashboard, quản lý hành chính bệnh nhân, dịch vụ, lượt khám và người dùng/vai trò cơ bản. Các bảng nền cho EMR, đồng thuận, bảng giá, BHTM, cọc/thanh toán, kho, labo và kế toán chưa có API/UI nghiệp vụ đầy đủ. Chưa dùng hệ thống để vận hành thực tế hoặc ghi nhận điều trị và tiền thật. Archive không thay thế sao lưu SQL Server hay quy trình khôi phục có kiểm duyệt.
