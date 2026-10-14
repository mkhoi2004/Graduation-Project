# Kết quả kiểm chứng môi trường — 14/10/2026

- Đích SQL: `DESKTOP-F5CFA0D\SQLEXPRESS`, TCP 1433, database `[Graduation Project]`.
- Backup trước reset: `Graduation_Project_before_reset_20261014_7bbc7311.bak`; SQL Server `RESTORE VERIFYONLY` báo hợp lệ.
- Reset: xóa 60 bảng user cũ trong transaction; giữ database và quyền cấp database. Schema mới tạo 99 bảng user.
- Schema verify: tất cả bảng bắt buộc cho 12 module, archive tables, trigger nền tảng và unique idempotency tồn tại; 0 FK disabled/untrusted.
- Legacy check: `dbo.UserRoles` và `dbo.AuditLogs` không còn; thay bằng `Users.RoleId` và `AccessAuditLogs`.
- Seed: 5 role, 6 user, 2 cấu hình versioned; chạy hai lần trên database test không tạo trùng.
- SQL smoke database tạm: archive giữ ID/người xóa; invalid role bị CHECK chặn; AccessAuditLogs chặn DELETE.
- Backend: `npm test` — 8/8 pass.
- Frontend: `npm run build` — thành công; có cảnh báo bundle chính 789 KB, chưa ảnh hưởng môi trường local.
- Giới hạn: API chưa kết nối DB vì `backend/.env` chưa có SQL Authentication credentials. AT-01 đến AT-24 cần backend nghiệp vụ và integration test, chưa được tuyên bố đạt.
