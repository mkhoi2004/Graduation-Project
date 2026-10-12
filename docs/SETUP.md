# Chạy dự án nha khoa

## 1. SQL Server

Máy phát triển đã được xác nhận dùng instance `.\SQLEXPRESS`. Đăng nhập Windows hiện tại cần quyền tạo database và đối tượng SQL trong lần cài đầu.

Chạy từ thư mục gốc, đúng thứ tự:

```powershell
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/001_schema.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/002_archive.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/003_hardening.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/verify.sql
sqlcmd -S '.\SQLEXPRESS' -E -b -i database/verify_hardening.sql
```

`-b` trả mã lỗi khác 0 nếu script thất bại. Các bài kiểm tra dùng transaction và dọn dữ liệu thử; hiện database `Graduation Project` đã tạo với 30 bảng chính, 30 bảng `_Deleted` và các trigger xóa.

## 2. API .NET

Cần .NET SDK 10. Cấu hình phát triển tại `backend/Graduation.Api/appsettings.Development.json` kết nối bằng Windows Integrated Security. Người chạy API phải có quyền trên database. Không lưu mật khẩu trong file cấu hình hoặc Git.

```powershell
$env:Jwt__Key = '<chuỗi bí mật ngẫu nhiên ít nhất 32 byte>'
$env:Bootstrap__AdminPassword = '<mật khẩu quản trị ban đầu dài hơn 8 ký tự, có ký tự đặc biệt>'
dotnet restore backend/GraduationProject.slnx
dotnet run --project backend/Graduation.Api/Graduation.Api.csproj --launch-profile http
```

Khi bảng `Users` trống, ứng dụng tạo tài khoản `admin` với mật khẩu trong `Bootstrap__AdminPassword`. Sau lần tạo đầu, bỏ biến môi trường này; ứng dụng không đặt lại mật khẩu mỗi khi khởi động. Chỉ cấu hình mật khẩu ban đầu ở máy tin cậy. API mặc định tại `http://localhost:5089`; `/health/ready` kiểm tra kết nối SQL. Trong triển khai thực tế cần HTTPS, quyền SQL tối thiểu và quy trình quản lý bí mật riêng.

## 3. Giao diện React

Cần Node.js và npm. Trong thư mục `frontend`:

```powershell
npm ci
npm run dev
```

Mở `http://localhost:5173`. Giao diện gọi API tại `http://localhost:5089/api`; có thể ghi đè bằng `VITE_API_URL`. Các lệnh kiểm tra:

```powershell
dotnet run --project backend/Graduation.Api.Tests/Graduation.Api.Tests.csproj
npm --prefix frontend test
npm --prefix frontend run build
```

Kiểm tra tích hợp cục bộ (Windows PowerShell, SQL Server `SQLEXPRESS`) tạo database thử có tên ngẫu nhiên và tự dọn sau khi chạy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File backend/Graduation.Api.Tests/integration.ps1
```

## Phạm vi đã triển khai và các phần còn thiếu

- API/UI hiện xử lý đăng nhập, phân quyền cơ bản, danh sách/tạo/sửa/xóa thông tin hành chính của bệnh nhân, tạo/xóa dịch vụ, tạo/xóa lượt khám chưa bắt đầu, quản lý người dùng/vai trò cơ bản và dashboard. Xóa qua API yêu cầu vai trò `ADMIN`, lý do và đi qua trigger `_Deleted`. Các lượt đọc/sửa hồ sơ hành chính được ghi `AuditLogs`.
- Cột dị ứng/tiền sử bệnh có trong schema nhưng không được API hành chính đọc hay ghi. Chỉ mở tính năng lâm sàng sau khi có quyền theo quan hệ điều trị, audit mục đích truy cập và lịch sử phiên bản/đính chính; hiện chưa có các luồng này.
- Schema đã có các bảng nền cho EMR, đồng thuận, bảng giá, dịch vụ thực hiện, BHTM, cọc/thanh toán, kho, tiệt trùng, labo, kế toán, bảo hành, nhân sự và tài sản. Chưa có API/UI nghiệp vụ hoàn chỉnh cho các module này; không nên dùng để vận hành thực tế hoặc ghi nhận tiền/điều trị cho đến khi luồng trạng thái, duyệt, đối soát và kiểm thử tích hợp được triển khai.
- `QUY_TRÌNH v14` loại bỏ tính tiền BHYT. BHTM là bảo lãnh thương mại riêng, hiện chỉ có cấu trúc dữ liệu và một số ràng buộc chéo; chưa có quy trình nộp/duyệt/đối soát hồ sơ.
- Archive lưu ảnh bản ghi và metadata xóa. Bảng `_Deleted` không thay thế sao lưu SQL Server, nhật ký bất biến, kiểm soát quyền truy cập dữ liệu y tế, hoặc quy trình khôi phục có kiểm duyệt.
- Trigger từ chối xóa lượt đã bắt đầu, dòng dịch vụ hoàn tất, EMR/đồng thuận đã ký, giao dịch tiền đã xác nhận, bút toán đã ghi sổ, xuất nhập kho và audit log. Trường hợp cần xóa hợp pháp phải có quy trình ngoại lệ riêng, hiện chưa triển khai.
- Chưa ghi đầy đủ các lần bị từ chối truy cập vào bảng audit, chưa có chính sách giữ log bất biến ngoài quyền quản trị SQL, hay tách quyền tài khoản SQL vận hành. Kiểm thử tích hợp hiện bao phủ đăng nhập và CRUD bệnh nhân; các nghiệp vụ khác còn cần kiểm thử tích hợp trước khi dùng dữ liệu bệnh nhân thật.
