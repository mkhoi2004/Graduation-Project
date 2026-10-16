# Dental ERP

Monorepo khởi tạo cho hệ thống ERP nha khoa, gồm React frontend, NestJS REST API và Microsoft SQL Server qua Prisma.

## Công nghệ

- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide React
- Backend: NestJS, TypeScript, REST API, class-validator, class-transformer
- Data: Microsoft SQL Server Express, Prisma ORM
- API management: OpenAPI/Swagger, sẵn sàng đồng bộ với APIdog
- Tooling: npm workspaces, Vitest

## Yêu cầu

- Node.js 22 trở lên
- npm 10 trở lên
- SQL Server Express 2017 trở lên
- Database `Graduation-Project` trên instance `DESKTOP-F5CFA0D\SQLEXPRESS` (kết nối TCP trực tiếp qua cổng `1433` vì SQL Browser đang tắt)
- TCP/IP được bật; cấu hình hiện tại dùng trực tiếp cổng `1433`, không phụ thuộc SQL Server Browser

## Bắt đầu

```powershell
npm install
Copy-Item .env.example .env
# Mở .env và thay JWT_SECRET bằng chuỗi ngẫu nhiên tối thiểu 32 ký tự
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Trên macOS/Linux, thay dòng sao chép file bằng `cp .env.example .env`.

Sau khi khởi động:

- Frontend: http://localhost:5173
- Backend health check: http://localhost:3000/api/health
- Swagger UI: http://localhost:3000/api/docs
- OpenAPI JSON cho APIdog: http://localhost:3000/api/openapi.json
- SQL Server: `DESKTOP-F5CFA0D:1433` (`SQLEXPRESS`), database `Graduation-Project`

## Tài khoản đăng nhập thử

Tất cả tài khoản demo dùng mật khẩu `Dental@123`:

- `admin` → `/admin` — Quản trị viên
- `reception` → `/reception` — Nhân viên tiếp nhận
- `doctor` → `/doctor` — Bác sĩ thực hiện
- `warehouse` → `/warehouse` — Quản lý kho
- `accounting` → `/accounting` — Nhân viên kế toán

Các route sau đăng nhập hiện chỉ là màn hình trống có tên vai trò và nút đăng xuất. Hãy đổi hoặc loại bỏ mật khẩu demo trước khi triển khai production.

Seed bị chặn khi `NODE_ENV=production`. Chỉ đặt `DEMO_SEED_ENABLED=true` nếu chủ động cần tạo tài khoản demo ở môi trường đó. Khi chạy lại seed, mật khẩu và trạng thái kích hoạt của tài khoản đã tồn tại không bị ghi đè.

## Kết nối APIdog

1. Chạy backend bằng `npm run dev:api`.
2. Trong APIdog, chọn **Import Project** hoặc **Import Data**.
3. Chọn OpenAPI/Swagger và nhập URL `http://localhost:3000/api/openapi.json`.
4. Bật Scheduled Import nếu muốn APIdog tự đồng bộ thay đổi.

Mỗi controller NestJS phải có `@ApiTags('Tên module')`; APIdog dùng tag để nhóm endpoint theo module nghiệp vụ.
Endpoint đăng nhập có response schema đầy đủ trong OpenAPI và bị giới hạn 5 request/phút/IP để giảm brute-force.

> Các route frontend hiện chỉ là điều hướng giao diện, không phải ranh giới phân quyền. Khi thêm API nghiệp vụ, mỗi endpoint phải được bảo vệ bằng JWT guard và role guard ở backend.

## Lệnh thường dùng

```bash
npm run dev          # chạy frontend và backend
npm run build        # build toàn bộ workspace
npm run lint         # lint toàn bộ workspace
npm test             # chạy unit tests
npm run test:e2e     # chạy backend e2e tests
npm run db:generate  # generate Prisma Client
npm run db:migrate   # tạo/chạy migration phát triển
npm run db:push      # đồng bộ schema với SQL Server trong môi trường local
npm run db:seed      # tạo/cập nhật 5 role và tài khoản demo
npm run db:studio    # mở Prisma Studio
```

## Cấu trúc

```text
apps/
  api/    NestJS REST API và Prisma schema
  web/    React frontend và thư viện UI dùng lại
.env.example
```

Các module nghiệp vụ (bệnh nhân, lịch hẹn, điều trị, kho, tài chính...) sẽ được bổ sung theo từng bounded context ở các bước sau.
