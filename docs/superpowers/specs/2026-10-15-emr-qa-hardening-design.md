# Thiết kế đợt kiểm thử và siết nghiệp vụ EMR nha khoa

## Mục tiêu

Đối chiếu độ phủ thực tế với `Test.md`, bổ sung các kiểm thử còn thiếu có rủi ro cao, sửa tối thiểu các lỗi đã tái hiện, và làm giao diện lâm sàng tổng quát hơn mà không thay đổi kiến trúc 12 module hiện hữu.

## Hiện trạng đã xác minh

- Baseline ngày 15/10/2026 tại commit `d77248e600c4c70850eb9535b3ea03b168cf05c7`: 96/96 automated tests Pass khi được phép kết nối SQL Server local và loopback.
- `Test.md` chưa có test case chuẩn theo ID/module/precondition/steps/input/expected/actual/status/severity/note; chưa phản ánh các khoảng trống UI, responsive và nghiệp vụ.
- Patient API chưa chặn ngày sinh tương lai, mâu thuẫn ngày sinh/năm sinh, email/SĐT sai, thiếu guardian dưới 18 tuổi; duplicate chỉ dựa trên SĐT.
- Appointment API chưa chặn thời gian quá khứ, khoảng thời gian đảo ngược, trùng bác sĩ/ghế; Visit API chấp nhận mọi chuyển trạng thái nằm trong enum.
- Tooth chart lưu `toothCode`/`surfaceCode` tự do; UI chỉ hiển thị 32 răng vĩnh viễn và chưa có 5 mặt răng.
- Thanh cảnh báo y khoa chỉ nằm trong modal bệnh nhân; chưa luôn hiển thị ở màn hình EMR.

## Nguyên tắc tham khảo áp dụng

- Hồ sơ bệnh nhân giữ header/tabs và cảnh báo dị ứng/bệnh nền dễ thấy, theo mô hình dashboard của OpenMRS/OpenEMR và patient record của Dentally.
- Odontogram hỗ trợ FDI răng vĩnh viễn/răng sữa, lựa chọn mặt răng và trạng thái/điều trị theo răng; không sao chép tài sản giao diện của hệ thống khác.
- Lịch hẹn và kế hoạch điều trị phải liên kết để lễ tân biết bước tiếp theo; status transition được kiểm soát thay vì cập nhật enum tự do.
- Danh mục và giá tiếp tục lấy từ cấu hình hiện có; không hard-code tên phòng khám trong khung ứng dụng.

## Phạm vi thực hiện

1. Thêm validator thuần cho bệnh nhân, lịch hẹn, lượt khám và odontogram; test unit không phụ thuộc DB.
2. Gắn validator vào service trước khi repository ghi dữ liệu; thêm kiểm tra overlap trong repository.
3. Mở rộng UI đăng ký bệnh nhân và EMR: email/guardian, thông báo điều kiện, alert y khoa, mixed dentition và 5 mặt răng.
4. Chuẩn hóa nhãn điều hướng, responsive cơ bản, focus/aria và trạng thái lỗi/loading ở các màn hình được chạm tới.
5. Cập nhật `Test.md` nhưng giữ toàn bộ lịch sử cũ; thêm snapshot hiện tại, test matrix, bug log, UI changes, business rules, risks và nguồn.

## Ngoài phạm vi đợt này

- Không tự xây dựng clinical decision support về liều theo cân nặng, tương tác thuốc hay chống chỉ định. Các mục này cần danh mục thuốc chuẩn và bác sĩ/dược sĩ xác nhận.
- Không thay schema lớn, không thay cơ chế ký số, kế toán, kho, bảo hiểm hoặc payroll nếu không có lỗi tái hiện.
- Không tuyên bố responsive/browser matrix Pass khi chưa chạy automation hoặc manual test trên kích thước tương ứng.

## Quyết định và giả định

- Tuổi được tính theo ngày sinh; nếu chỉ có năm sinh thì dùng tuổi xấp xỉ và vẫn yêu cầu guardian khi năm hiện tại trừ năm sinh nhỏ hơn 18.
- SĐT chấp nhận định dạng Việt Nam nội địa 10 chữ số bắt đầu bằng `0` hoặc E.164 bắt đầu bằng `+` (8–15 chữ số). Đây là quy tắc dữ liệu tổng quát, không phải xác minh số điện thoại đang hoạt động.
- FDI hợp lệ: vĩnh viễn `11–18, 21–28, 31–38, 41–48`; răng sữa `51–55, 61–65, 71–75, 81–85`.
- Mặt răng chuẩn dữ liệu: `M`, `O`, `I`, `D`, `B`, `F`, `L`, `P`; `O/I`, `B/F`, `L/P` là cặp phụ thuộc nhóm răng và cách hiển thị. Chi tiết lâm sàng cần bác sĩ xác nhận trước triển khai production.
- Giờ làm việc không được hard-code trong đợt này vì chưa có cấu hình lịch làm việc; case ngoài giờ được đánh dấu Not tested và là rủi ro còn lại.

