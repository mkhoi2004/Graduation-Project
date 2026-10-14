# Cơ sở dữ liệu local

Nguồn schema mới: `bootstrap.sql`. Chạy bằng SSMS SQLCMD Mode hoặc:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -C -b -i .\database\bootstrap.sql
```

Chạy lệnh từ thư mục gốc repository vì các lệnh `:r` dùng đường dẫn tương đối `./database`. `01_create_database.sql` chỉ tạo database nếu chưa tồn tại. Các file 02–05 không chạy riêng: bootstrap gói chúng trong một transaction, khóa cài schema bằng sp_getapplock, ghi marker sau DDL và rollback toàn bộ schema khi lỗi. Database mới tạo có thể còn trống sau lỗi và có thể chạy lại bootstrap.

Chạy lại trên nền tảng cùng phiên bản chỉ verify, không seed hay đặt lại dữ liệu. Có marker nhưng thiếu bảng/trigger/unique thì bị từ chối; đây là kiểm tra các đối tượng quan trọng, không thay thế migration checksum hoặc kiểm toán schema toàn diện. Trên schema lạ không có marker, script từ chối. **Không thêm marker bằng tay để vượt guard.**

## Database trên máy hiện tại

Ngày 14/10/2026, theo yêu cầu trực tiếp của người dùng, 60 bảng nghiệp vụ cũ trong `[Graduation Project]` trên SQLEXPRESS đã được xóa bằng `reset-tables.sql`; database và quyền cấp database được giữ lại. Schema mới có 99 bảng người dùng, marker `001-full-schema`, 5 role và 6 user mẫu. `UserRoles` và `AuditLogs` cũ không còn; schema mới dùng `Users.RoleId` và `AccessAuditLogs`.

Bản backup trước reset đã được tạo và `RESTORE VERIFYONLY` xác nhận hợp lệ tại:

`C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\Backup\Graduation_Project_before_reset_20261014_7bbc7311.bak`

`reset-tables.sql` là script phá hủy, có guard đúng máy/instance, xóa FK trước bảng trong transaction rồi chạy bootstrap và seed. Không dùng `reset-database.sql`; file đó chỉ là phương án tham khảo và bị thay thế bởi reset bảng để giữ quyền database.

## Đã triển khai trong schema

- 12 module: người dùng/audit, danh mục, bệnh nhân/lượt, EMR/đồng thuận, thanh toán/cọc, kho, kế toán, BHTM, tiệt trùng/labo/bảo hành, hoa hồng/nhân sự, tài sản và đối soát.
- Roles, Branches, Users: PK UUID, unique mã/username, FK, default, rowversion; Users có RoleId trực tiếp và IsApprover.
- Roles_Deleted, Branches_Deleted, Users_Deleted: bản chụp các cột, Version dạng BINARY(8), không IDENTITY hoặc FK ngoài; DeletedAt và DeletedBy. Mỗi lần archive là một dòng, cho phép vòng đời restore/xóa về sau.
- Trigger archive đòi SESSION_CONTEXT username, xử lý nhiều dòng; FK ngăn xóa cha còn tham chiếu. Trước DELETE phải set username trên đúng transaction connection; reset trước trả connection về pool. Chưa có endpoint delete/restore.
- ID chính không được update. AccessAuditLogs chặn UPDATE/DELETE. ActorId lưu như snapshot không FK để giữ audit sau xóa tài khoản hành chính.
- IdempotencyKeys có unique Scope+Key (so sánh phân biệt hoa thường), hash SHA-256 dạng hex và JSON response; chỉ lưu thành công đã commit cùng giao dịch nghiệp vụ trong tương lai.

## Kiểm thử cô lập

`scripts/test-database.ps1` thực thi DDL trên database thử nghiệm mới có tên ngẫu nhiên rồi dọn. SQL smoke kiểm tra archive, ràng buộc role, append-only audit. Không chứng minh các AT nghiệp vụ, seed với quyền SQL login thực, restore archive, hoặc migration dữ liệu cũ đã đạt.

## Trình tự mở rộng

Schema nền tảng cho Module 1–12 đã có. Tiếp tục triển khai API/UI theo thứ tự Module 1/2 → 3/4/5 → 6/7 → 8–12. Mọi thay đổi schema tiếp theo phải là migration phiên bản mới; không sửa baseline đã áp dụng để giả nâng cấp. Việc có bảng chưa đồng nghĩa máy trạng thái, transaction nghiệp vụ hoặc AT-01 đến AT-24 đã hoàn thành.
