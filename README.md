# Chạy dự án trên máy local

Dự án dùng **NestJS/Node.js** cho API, **React** cho giao diện và SQL Server `.\SQLEXPRESS` với database `Graduation Project`. Máy cần Node.js 24, npm, SQL Server Express và ODBC Driver 17 for SQL Server. Database và tài khoản mẫu đã có trên máy này.

## 1. Chạy API

Mở PowerShell thứ nhất:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project\backend
npm ci
$env:JWT_KEY = 'GraduationProject-LocalOnly-DevKey-2026-ChangeThis@'
npm run dev
```

Giữ cửa sổ này mở. Truy cập `http://localhost:5089/health/ready`; nếu thấy `{"status":"ready"}` là API đã kết nối SQL Server.

## 2. Chạy giao diện

Mở PowerShell thứ hai:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project\frontend
npm ci
npm run dev
```

Mở `http://localhost:5173` và đăng nhập:

- Quản trị: `admin` / `Admin1234@`
- Lễ tân: `receptionist` / `Reception1234@`
- Bác sĩ: `doctor` / `Doctor1234@`
- Lễ tân demo: `demo.receptionist` / `Reception1234@`
- Bác sĩ demo: `demo.doctor` / `Doctor1234@`

`npm ci` chỉ cần chạy lần đầu hoặc khi gói phụ thuộc thay đổi. Những lần sau, chạy `npm run dev` ở mỗi thư mục. Dừng chương trình bằng `Ctrl+C`. Mật khẩu mới phải dài hơn 8 ký tự và có ký tự đặc biệt; các mật khẩu mẫu trên chỉ dùng cho máy local.

Nếu cần nạp lại dữ liệu mẫu, chạy từ thư mục gốc:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -b -f 65001 -i database/004_demo_data.sql
```
