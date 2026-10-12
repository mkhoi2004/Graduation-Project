# Chạy dự án nha khoa trên máy local

Dự án hiện kết nối SQL Server `.\SQLEXPRESS` (Windows Authentication) với database `Graduation Project`. Database và ba tài khoản thử đã được tạo trên máy này. Cần bật SQL Server, cài .NET SDK 10 và Node.js/npm trước khi chạy.

## 1. Chạy API

Mở PowerShell tại thư mục dự án:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project
$env:Jwt__Key = 'GraduationProject-LocalOnly-DevKey-2026-ChangeThis@'
dotnet restore backend/GraduationProject.slnx
dotnet run --project backend/Graduation.Api/Graduation.Api.csproj --launch-profile http
```

Giữ cửa sổ này mở. Truy cập `http://localhost:5089/health/ready`; nếu hiện `{"status":"ready"}` thì API đã kết nối database.

## 2. Chạy giao diện

Mở **cửa sổ PowerShell thứ hai**:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project\frontend
npm ci
npm run dev
```

Mở `http://localhost:5173` và đăng nhập bằng một trong các tài khoản sau:

- Quản trị (`ADMIN`): tên đăng nhập `admin`, mật khẩu `Admin1234@`.
- Lễ tân (`RECEPTIONIST`): tên đăng nhập `receptionist`, mật khẩu `Reception1234@`.
- Bác sĩ (`DOCTOR`): tên đăng nhập `doctor`, mật khẩu `Doctor1234@`.

Tài khoản quản trị có thể tạo thêm người dùng. **Mật khẩu mới phải dài hơn 8 ký tự (tối thiểu 9) và có ít nhất một ký tự đặc biệt**, ví dụ `@`. Các mật khẩu trên chỉ dùng để thử trên máy local.

## Khi tạo lại database

Nếu database `Graduation Project` bị xóa và cần dựng lại, chạy từ thư mục gốc theo thứ tự:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/001_schema.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/002_archive.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/003_hardening.sql
$env:Bootstrap__SeedLocalAccounts = 'true'
$env:Jwt__Key = 'GraduationProject-LocalOnly-DevKey-2026-ChangeThis@'
dotnet run --project backend/Graduation.Api/Graduation.Api.csproj --launch-profile http
```

Lần chạy này chỉ tạo ba tài khoản mẫu **khi bảng `Users` trống**. Nó không đổi mật khẩu tài khoản đã có. Sau đó có thể đóng API, chạy `Remove-Item Env:Bootstrap__SeedLocalAccounts`, rồi khởi động lại theo bước 1.
