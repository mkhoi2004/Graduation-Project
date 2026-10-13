# Chạy dự án nha khoa trên máy local

Dự án dùng **NestJS/TypeScript** cho API, React/TypeScript cho giao diện và SQL Server `.\SQLEXPRESS` cho dữ liệu. Database `Graduation Project` và dữ liệu mẫu đã có trên máy này. Cần Node.js 24, npm, SQL Server Express và **ODBC Driver 17 for SQL Server**. API dùng Windows Authentication của tài khoản đang chạy PowerShell.

## 1. Chạy API NestJS

Mở PowerShell:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project\backend
npm ci
$env:JWT_KEY = 'GraduationProject-LocalOnly-DevKey-2026-ChangeThis@'
npm run dev
```

Giữ cửa sổ này mở. Truy cập `http://localhost:5089/health/ready`; phản hồi `{"status":"ready"}` nghĩa là API đã kết nối SQL Server. API giữ các route `/api` mà giao diện đang dùng.

## 2. Chạy giao diện

Mở PowerShell thứ hai:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project\frontend
npm ci
npm run dev
```

Mở `http://localhost:5173` và đăng nhập:

- Quản trị (`ADMIN`): `admin` / `Admin1234@`.
- Lễ tân (`RECEPTIONIST`): `receptionist` / `Reception1234@`.
- Bác sĩ (`DOCTOR`): `doctor` / `Doctor1234@`.
- Lễ tân demo (`RECEPTIONIST`): `demo.receptionist` / `Reception1234@`.
- Bác sĩ demo (`DOCTOR`): `demo.doctor` / `Doctor1234@`.

Tài khoản quản trị có thể tạo người dùng. Mật khẩu mới phải **dài hơn 8 ký tự và có ít nhất một ký tự đặc biệt**. Các mật khẩu mẫu và `JWT_KEY` trên chỉ dùng khi chạy local.

## Dữ liệu mẫu cho toàn bộ bảng nghiệp vụ

Sau khi đã có ba tài khoản đầu tiên, chạy một lần từ thư mục gốc:

```powershell
cd C:\Users\ADMIN\Documents\GitHub\Graduation-Project
sqlcmd -S '.\SQLEXPRESS' -E -b -f 65001 -i database/004_demo_data.sql
```

Script tạo khoảng 5 bản ghi giả lập cho mỗi bảng nghiệp vụ, 2 tài khoản demo bổ sung và 2 dòng Nợ/Có cho mỗi trong 5 bút toán. Bảng `Roles` giữ 3 vai trò của ứng dụng. `-f 65001` giữ đúng dấu tiếng Việt khi đọc file UTF-8. Các mã `DEMO-*` giúp nhận diện dữ liệu mẫu; chạy lại lệnh sẽ không tạo trùng. Dữ liệu bảo hiểm trong script là **bảo hiểm tư nhân giả lập**, không tính tiền BHYT. Nếu vừa tạo lại database, hãy khởi động API một lần với `SEED_LOCAL_ACCOUNTS=true` như bên dưới, rồi mới chạy script này.

## Nếu tạo lại database

Chạy từ thư mục gốc theo đúng thứ tự:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/001_schema.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/002_archive.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/003_hardening.sql
cd backend
npm ci
$env:NODE_ENV = 'development'
$env:SEED_LOCAL_ACCOUNTS = 'true'
$env:JWT_KEY = 'GraduationProject-LocalOnly-DevKey-2026-ChangeThis@'
npm run dev
```

Việc tạo tài khoản mẫu chỉ chạy khi bảng `Users` trống; nó không đặt lại mật khẩu của tài khoản đã có. Sau lần đầu, đóng API, chạy `Remove-Item Env:SEED_LOCAL_ACCOUNTS`, rồi mở lại bằng các lệnh ở bước 1.

## Kiểm tra

```powershell
npm --prefix backend test
npm --prefix backend run build
npm --prefix frontend test
npm --prefix frontend run build
powershell -NoProfile -ExecutionPolicy Bypass -File backend/test/integration.ps1
```

Bài kiểm tra tích hợp tạo database thử có tên ngẫu nhiên và tự xóa sau khi chạy. API chưa có endpoint thu tiền; các phép tính tiền chuẩn bị cho nghiệp vụ dùng `decimal.js` với chuỗi thập phân, không dùng `number` để tính số tiền.
