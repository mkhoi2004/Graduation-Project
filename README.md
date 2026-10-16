# Dental ERP - Hệ Thống Quản Lý Phòng Khám Nha Khoa

Dental ERP là hệ thống quản lý phòng khám nha khoa toàn diện được xây dựng theo kiến trúc **Monorepo** (gồm Backend NestJS, Frontend React và cơ sở dữ liệu Microsoft SQL Server thông qua Prisma ORM).

---

## 📑 Mục lục

- [1. Công nghệ sử dụng](#1-công-nghệ-sử-dụng)
- [2. Yêu cầu hệ thống](#2-yêu-cầu-hệ-thống)
- [3. Cấu hình Microsoft SQL Server](#3-cấu-hình-microsoft-sql-server)
- [4. Các bước cài đặt và chạy Local](#4-các-bước-cài-đặt-và-chạy-local)
- [5. Thông tin truy cập & Tài khoản demo](#5-thông-tin-truy-cập--tài-khoản-demo)
- [6. Các lệnh thường dùng (Scripts)](#6-các-lệnh-thường-dùng-scripts)
- [7. Đồng bộ API với APIdog / Swagger](#7-đồng-bộ-api-với-apidog--swagger)
- [8. Cấu trúc thư mục](#8-cấu-trúc-thư-mục)
- [9. Xử lý lỗi thường gặp (Troubleshooting)](#9-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## 1. Công nghệ sử dụng

- **Frontend (`apps/web`)**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, React Router 7.
- **Backend (`apps/api`)**: NestJS 12, TypeScript, REST API, Class Validator, Class Transformer, Throttler (Rate Limiting).
- **Cơ sở dữ liệu & ORM**: Microsoft SQL Server (Express/Standard), Prisma ORM v6.
- **API Documentation**: OpenAPI 3.0 / Swagger UI, hỗ trợ đồng bộ tự động với APIdog.
- **Quản lý Monorepo & Testing**: npm workspaces, Vitest.

---

## 2. Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

1. **Node.js**: Phiên bản `22.0.0` trở lên (`node -v`)
2. **npm**: Phiên bản `10.0.0` trở lên (`npm -v`)
3. **Microsoft SQL Server**: Bản Express 2017+ hoặc Developer/Standard (khuyến nghị kèm [SSMS - SQL Server Management Studio](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms) hoặc Azure Data Studio).

---

## 3. Cấu hình Microsoft SQL Server

Prisma kết nối với SQL Server qua giao thức mạng TCP/IP. Với các bản **SQL Server Express**, mặc định giao thức TCP/IP thường bị **Tắt (Disabled)** và cổng động (Dynamic Port). Bạn cần kích hoạt theo các bước sau:

### Bước 3.1: Bật giao thức TCP/IP và đặt cổng 1433
1. Nhấn phím `Windows + R`, nhập `SQLServerManager16.msc` (hoặc mở ứng dụng **SQL Server Configuration Manager**).
2. Tìm đến mục **SQL Server Network Configuration** -> **Protocols for SQLEXPRESS** (hoặc instance của bạn).
3. Nhấp đúp vào **TCP/IP** -> chuyển **Enabled** sang **Yes**.
4. Chuyển sang tab **IP Addresses**:
   - Kéo xuống dưới cùng tại mục **IPAll**:
     - Xóa trống giá trị tại ô **TCP Dynamic Ports**.
     - Nhập `1433` vào ô **TCP Port**.
5. Nhấn **OK** để lưu.

### Bước 3.2: Khởi động lại dịch vụ SQL Server
1. Trong cửa sổ Configuration Manager, chọn mục **SQL Server Services**.
2. Nhấp chuột phải vào **SQL Server (SQLEXPRESS)** -> chọn **Restart**.
3. *(Tùy chọn)* Kiểm tra xem cổng 1433 đã hoạt động chưa bằng PowerShell:
   ```powershell
   Get-NetTCPConnection -LocalPort 1433 -ErrorAction SilentlyContinue
   ```

### Bước 3.3: Tạo Database `Graduation-Project`
Mở SSMS hoặc chạy lệnh qua command line (`sqlcmd`):
```sql
CREATE DATABASE [Graduation-Project];
```
*(Nếu database đã tồn tại, bạn có thể bỏ qua bước này).*

---

## 4. Các bước cài đặt và chạy Local

### Bước 4.1: Clone dự án và cài đặt dependencies
Mở terminal (PowerShell hoặc Command Prompt) tại thư mục dự án:
```powershell
# Cài đặt toàn bộ dependencies cho cả web và api
npm install
```

### Bước 4.2: Thiết lập biến môi trường (.env)
Tạo file `.env` ở thư mục gốc của dự án:
```powershell
# Trên Windows PowerShell:
Copy-Item .env.example .env

# Trên macOS / Linux:
cp .env.example .env
```

Mở file `.env` và kiểm tra cấu hình:
```env
# 1. Chuỗi kết nối SQL Server (Dùng Windows Authentication)
DATABASE_URL="sqlserver://localhost:1433;database=Graduation-Project;integratedSecurity=true;trustServerCertificate=true;schema=dbo"

# Hoặc nếu dùng tài khoản SQL Server Authentication (sa):
# DATABASE_URL="sqlserver://localhost:1433;database=Graduation-Project;user=sa;password=MatKhauCuaBan;trustServerCertificate=true;schema=dbo"

# 2. Khóa bảo mật JWT (BẮT BUỘC tối thiểu 32 ký tự và không dùng giá trị mặc định)
JWT_SECRET="dental-erp-development-super-secret-key-32chars"

# 3. Môi trường chạy
NODE_ENV=development
DEMO_SEED_ENABLED=false

# 4. Cấu hình Backend API
API_PORT=3000
FRONTEND_URL=http://localhost:5173

# 5. Cấu hình Frontend
VITE_API_URL=http://localhost:3000/api
```

> [!IMPORTANT]
> - `JWT_SECRET`: Phải có độ dài từ 32 ký tự trở lên và khác chuỗi mặc định `replace-with-a-long-random-secret-before-production`, nếu không Backend sẽ chặn khởi động để bảo vệ an toàn.
> - `DATABASE_URL`: Thay `localhost:1433` bằng tên máy (ví dụ `DESKTOP-F5CFA0D:1433`) nếu kết nối qua tên máy tính.

### Bước 4.3: Sinh Prisma Client và đồng bộ CSDL
Chạy chuỗi lệnh sau để hoàn tất thiết lập cơ sở dữ liệu:

```powershell
# 1. Sinh Prisma Client
npm run db:generate

# 2. Đẩy schema vào SQL Server (tự động tạo bảng Role, User,...)
npm run db:push

# 3. Nạp dữ liệu mẫu ban đầu (tạo các role và tài khoản người dùng demo)
npm run db:seed
```

### Bước 4.4: Khởi động dự án
Chạy cả Frontend và Backend cùng lúc chỉ với 1 câu lệnh:

```powershell
npm run dev
```

*(Hoặc bạn có thể mở 2 tab terminal riêng biệt: một tab chạy `npm run dev:api`, một tab chạy `npm run dev:web`).*

---

## 5. Thông tin truy cập & Tài khoản demo

Sau khi chạy lệnh `npm run dev`:

| Dịch vụ | URL | Mô tả |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:5173](http://localhost:5173) | Giao diện đăng nhập và các phân hệ làm việc |
| **Backend Health** | [http://localhost:3000/api/health](http://localhost:3000/api/health) | Kiểm tra trạng thái hoạt động của NestJS API |
| **Swagger UI** | [http://localhost:3000/api/docs](http://localhost:3000/api/docs) | Tài liệu tra cứu & kiểm thử API trực quan |
| **OpenAPI Spec** | [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json) | File đặc tả OpenAPI để import vào APIdog / Postman |
| **Prisma Studio** | `npm run db:studio` | Giao diện đồ họa xem và quản lý dữ liệu database |

### Danh sách tài khoản đăng nhập thử nghiệm

Tất cả tài khoản demo sử dụng mật khẩu chung: `Dental@123`

| Tên đăng nhập | Vai trò (Role) | Trang chuyển hướng sau đăng nhập |
| :--- | :--- | :--- |
| `admin` | Quản trị viên (Admin) | `/admin` |
| `reception` | Nhân viên tiếp nhận | `/reception` *(Phân hệ tiếp nhận bệnh nhân)* |
| `doctor` | Bác sĩ điều trị | `/doctor` |
| `warehouse` | Quản lý kho | `/warehouse` |
| `accounting` | Nhân viên kế toán | `/accounting` |

> [!NOTE]
> Phân hệ **Nhân viên tiếp nhận (`/reception`)** đã hoàn thiện các quy trình nghiệp vụ:
> - Quản lý danh sách & tạo mới hồ sơ bệnh nhân (sinh mã tự động `MBN-YYYYMMDD/xxxx`).
> - Tạo phiếu tiếp nhận khám (sinh mã `TNK-YYYYMMDD/xxxx`).
> - Chọn dịch vụ điều trị (cơ bản, thẩm mỹ, niềng răng, implant), chỉ định bác sĩ & phòng khám.
> - Xem và in phiếu tiếp nhận / chuyển bệnh nhân sang bác sĩ khám.
> - Báo cáo kết quả kiểm tra và trạng thái API chi tiết xem tại [TestReception.md](file:///c:/Users/ADMIN/Documents/GitHub/Graduation-Project/TestReception.md).

---

## 6. Các lệnh thường dùng (Scripts)

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `npm run dev` | Khởi động song song cả Frontend (Vite) và Backend (NestJS) |
| `npm run dev:web` | Chỉ khởi động Frontend React (`localhost:5173`) |
| `npm run dev:api` | Chỉ khởi động Backend NestJS (`localhost:3000`) ở chế độ watch |
| `npm run build` | Build production cho toàn bộ workspace |
| `npm test` | Chạy bộ kiểm thử (Unit tests) bằng Vitest |
| `npm run test:e2e` | Chạy bộ kiểm thử End-to-End cho Backend API |
| `npm run lint` | Kiểm tra chất lượng mã nguồn với Oxlint |
| `npm run db:generate` | Tạo lại Prisma Client TypeScript bindings |
| `npm run db:push` | Đồng bộ schema từ file `schema.prisma` trực tiếp vào database |
| `npm run db:migrate` | Tạo và thực thi migration (cho môi trường production/staging) |
| `npm run db:seed` | Nạp dữ liệu mặc định (Roles và Users demo) vào database |
| `npm run db:studio` | Khởi chạy Prisma Studio trên trình duyệt để duyệt dữ liệu |

---

## 7. Đồng bộ API với APIdog / Swagger

1. Khởi động Backend API (`npm run dev:api` hoặc `npm run dev`).
2. Mở **APIdog**, tạo hoặc mở Project của bạn.
3. Chọn **Settings** -> **Import Data** -> **OpenAPI/Swagger**.
4. Chọn hình thức **URL Import** và điền:
   ```
   http://localhost:3000/api/openapi.json
   ```
5. Bật tính năng **Scheduled Import** (nhập định kỳ) nếu bạn muốn APIdog tự động đồng bộ mỗi khi backend cập nhật endpoint mới.

---

## 8. Cấu trúc thư mục

```text
Graduation-Project/
├── apps/
│   ├── api/                     # Backend NestJS REST API
│   │   ├── prisma/              # Prisma schema và seed script
│   │   ├── src/
│   │   │   ├── auth/            # Module xác thực JWT & Guard phân quyền
│   │   │   ├── config/          # Cấu hình biến môi trường & validation
│   │   │   ├── infrastructure/  # Kết nối database PrismaService
│   │   │   ├── main.ts          # Điểm khởi chạy NestJS app
│   │   │   └── openapi.ts       # Cấu hình Swagger/OpenAPI documentation
│   │   └── test/                # E2E test cases
│   └── web/                     # Frontend React (Vite + Tailwind)
│       └── src/
│           ├── components/      # UI components tái sử dụng (shadcn/ui style)
│           ├── features/        # Các module nghiệp vụ theo Domain
│           │   ├── auth/        # Giao diện & logic đăng nhập
│           │   └── reception/   # Phân hệ nghiệp vụ Tiếp nhận bệnh nhân
│           └── lib/             # Utilities, Session & Role Routing
├── docs/                        # Tài liệu đặc tả và kế hoạch phát triển
├── .env.example                 # Mẫu khai báo biến môi trường
├── package.json                 # Cấu hình npm workspaces cho toàn bộ dự án
└── README.md                    # Hướng dẫn chạy dự án
```

---

## 9. Xử lý lỗi thường gặp (Troubleshooting)

### 9.1. Lỗi: `Can't reach database server at ...:1433`
- **Nguyên nhân**: Dịch vụ SQL Server chưa chạy hoặc chưa bật kết nối TCP/IP cổng 1433.
- **Cách khắc phục**:
  1. Kiểm tra dịch vụ SQL Server có đang chạy không (`Get-Service *mssql*`).
  2. Làm lại [Bước 3.1](#bước-31-bật-giao-thức-tcpip-và-đặt-cổng-1433) để chắc chắn đã bật TCP/IP và đặt cổng 1433 trong *SQL Server Configuration Manager*.
  3. Khởi động lại dịch vụ SQL Server.

### 9.2. Lỗi: `Invalid environment configuration: JWT_SECRET must be longer than or equal to 32 characters`
- **Nguyên nhân**: Biến `JWT_SECRET` trong file `.env` bị thiếu, ngắn hơn 32 ký tự, hoặc bạn chưa đổi chuỗi mẫu `replace-with-a-long-random-secret-before-production`.
- **Cách khắc phục**: Mở file `.env` và đặt một chuỗi bí mật bất kỳ dài trên 32 ký tự (ví dụ: `JWT_SECRET="dental-erp-development-super-secret-key-32chars"`).

### 9.3. Lỗi: `EADDRINUSE: address already in use :::3000` hoặc `5173`
- **Nguyên nhân**: Cổng 3000 hoặc 5173 đang bị chiếm dụng bởi một tiến trình khác (hoặc phiên bản server trước chưa tắt hẳn).
- **Cách khắc phục**:
  - Tìm và tắt tiến trình đang chiếm cổng trên PowerShell:
    ```powershell
    # Tìm tiến trình ở cổng 3000
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
    ```

### 9.4. Lỗi Prisma Client: `Cannot find module '@prisma/client'`
- **Cách khắc phục**: Chạy lệnh sinh lại client:
  ```powershell
  npm run db:generate
  ```
