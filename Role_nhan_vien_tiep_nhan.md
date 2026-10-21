# Role Nhân Viên Tiếp Nhận & Lễ Tân (DentalKhoi ERP)

Sau khi đăng nhập tài khoản thuộc vai trò Tiếp nhận, nhân viên làm việc tại phân hệ Tiếp nhận đón tiếp (`/reception`):

---

## 1. Danh Mục Tài Khoản Tiếp Nhận Thực Tế
Phòng khám có 3 nhân sự tiếp nhận phân bổ tại các quầy đón tiếp:
- **Trần Thị Tiếp Nhận** (`reception`): Tổ trưởng Lễ tân & Thu ngân trung tâm — Trực tại **Quầy đón tiếp trung tâm**.
- **Nguyễn Thanh Hoa** (`reception-hoa`): Nhân viên Lễ tân & CSKH — Trực tại **Quầy đón tiếp 01**.
- **Võ Phương Mai** (`reception-mai`): Nhân viên Tiếp nhận & Điều phối ca khám — Trực tại **Quầy đón tiếp 02**.

---

## 2. Nút Chấm Công Check-in / Check-out Trên Header Chung
- Nút **Check-in / Check-out** xuất hiện cố định ở **thanh đầu trang dùng chung (Header)** của `/reception`, thao tác nhanh được trên máy tính và di động.
- Giờ chấm công lấy trực tiếp từ máy chủ phòng khám (`Asia/Ho_Chi_Minh`), đảm bảo tính khách quan và duy nhất trong ngày.
- Lần bấm đầu tiên là giờ gốc bất biến; các lần bấm lặp sau hệ thống thông báo trạng thái mà không ghi đè dữ liệu gốc.

---

## 3. Quy Trình Nghiệp Vụ Tại Phân Hệ Tiếp Nhận

### 3.1. Tạo / Cập nhật hồ sơ bệnh nhân
- Tìm kiếm hồ sơ bệnh nhân theo tên, số điện thoại, mã bệnh nhân:
  - Nếu bệnh nhân cũ: **Không tạo lại**, có thể cập nhật thông tin hành chính, địa chỉ, tiền sử bệnh/dị ứng.
  - Nếu bệnh nhân mới: Tạo mới thông tin (họ tên, ngày sinh, giới tính, số điện thoại, địa chỉ).
- Khi tạo mới, hệ thống tự động sinh **Mã bệnh nhân** duy nhất:
  - Định dạng: `MBN-YYYYMMDD/XXXX` (ví dụ: `MBN-20261019/0001`).
- **Phân trang:** Cố định **10 dòng / trang** trên bảng danh sách hồ sơ bệnh nhân.

### 3.2. Mở phiếu tiếp nhận khám bệnh
- Tạo lượt khám tiếp nhận cho bệnh nhân:
  - Hệ thống tự động sinh **Mã tiếp nhận**: `TN-YYYYMMDD/XXXX` (ví dụ: `TN-20261019/0001`).
  - Ghi nhận triệu chứng ban đầu và chọn đúng một trong hai mức **Thường** (mặc định) hoặc **Ưu tiên**. Không có mức thứ ba; chọn Ưu tiên bắt buộc nhập/chọn lý do.
  - Chọn bác sĩ đang trực theo phân ca HR; phòng khám tự điền từ ca trực và chỉ đọc. Nếu bác sĩ chưa có ca hôm nay, hệ thống cảnh báo và chỉ cho chọn phòng thủ công khi đã nhập lý do ghi đè.
  - Một bệnh nhân có thể có nhiều lượt tiếp nhận ở các ngày khác nhau.
- **Phân trang:** Cố định **10 dòng / trang** trên bảng danh sách lượt tiếp nhận trong ngày.

### 3.3. Chỉ định dịch vụ & Lập báo giá

Bảng giá dịch vụ niêm yết tại DentalKhoi:

#### A. Điều trị cơ bản
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|:-------:|:-----------:|
| Cạo vôi + đánh bóng | 400.000 VNĐ | 2 hàm |
| Trám răng thẩm mỹ | 300.000 VNĐ | 1 chiếc |
| Lấy tủy răng cửa | 2.000.000 VNĐ | 1 chiếc |
| Lấy tủy răng hàm | 3.000.000 VNĐ | 1 chiếc |
| Nhổ răng thường | 300.000 VNĐ | 1 chiếc |
| Nhổ răng khôn (tiểu phẫu) | 500.000 VNĐ | 1 chiếc |

#### B. Thẩm mỹ và phục hình
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|:-------:|:-----------:|
| Tẩy trắng tại phòng khám | 3.000.000 VNĐ | 2 hàm |
| Máng tẩy trắng tại nhà | 1.500.000 VNĐ | 2 hàm |
| Răng sứ kim loại | 1.500.000 VNĐ | 1 cái |
| Răng toàn sứ Zirconia | 8.000.000 VNĐ | 1 cái |
| Răng toàn sứ cao cấp Cercon HT | 15.000.000 VNĐ | 1 cái |

#### C. Chỉnh nha & Cấy ghép Implant
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|:-------:|:-----------:|
| Niềng răng mắc cài kim loại | 40.000.000 VNĐ | 2 hàm |
| Niềng răng mắc cài sứ / tự buộc | 50.000.000 VNĐ | 2 hàm |
| Niềng răng khay trong suốt | 70.000.000 VNĐ | 2 hàm |

- Một TNK chỉ thuộc một phòng, một bác sĩ và một STT; mọi dịch vụ trong TNK dùng cùng phân công đó.
- Khi lưu TNK đã có dịch vụ, bác sĩ và phòng hợp lệ, backend tự cấp STT `0001`–`9999` theo phòng/ngày. Nhân viên không được nhập hoặc sửa STT.
- Sau khi đã cấp STT, khóa dịch vụ, bác sĩ, phòng và mức ưu tiên. Muốn thay đổi phải **hủy TNK còn chờ có lý do và làm lại TNK mới**; STT cũ không tái sử dụng.
- Danh sách Phiếu tiếp nhận hiển thị/lọc theo ngày, phòng, mức ưu tiên và có các cột STT, ưu tiên, phòng, bác sĩ, trạng thái; đồng thời hiển thị **STT đang gọi** của từng phòng.

### 3.4. Thu tiền & Cổng thanh toán MoMo QR
- **Thu tiền mặt tại quầy:** Nhân viên thu tiền mặt, hệ thống cập nhật trạng thái `isPaid = true` và tự động đẩy bút toán thu tiền mặt sang sổ quỹ Kế toán (`CashLedger`).
- **Thanh toán trực tuyến MoMo QR Code:** Hệ thống tạo mã QR động ký số chuẩn HMAC-SHA256, tự động nhận Webhook IPN khi giao dịch thành công.

### 3.5. In Phiếu Thu Tiền Chuẩn A5
- In phiếu thu tiền khám dịch vụ khổ A5 chuyên nghiệp giao cho người bệnh.
- Hệ thống lưu vết nhật ký in (`print_log`); in lần thứ 2 trở đi tự động đóng dấu **"BẢN SAO"**.
- Phiếu tiếp nhận có STT 4 chữ số in lớn, mức Thường/Ưu tiên (kèm lý do nếu Ưu tiên), phòng, bác sĩ, mã TNK, MBN, họ tên và ngày giờ. In lại giữ nguyên STT và ghi người/giờ in.

### 3.6. Bàn Giao Ca Sang Bác Sĩ & Hưởng Thưởng 5%
- Khi TNK hợp lệ được chuyển sang hàng chờ, bệnh nhân xuất hiện theo STT tại `/doctor`; mức Ưu tiên chỉ được đánh dấu, không tự chen hàng.
- Nhân viên được hủy TNK khi còn chờ với lý do bắt buộc. Không được hủy TNK đã gọi; mọi thao tác cấp/hủy/in STT được lưu audit log.
- **Thưởng hoa hồng dịch vụ 5% Lễ tân:** Khi Bác sĩ điều trị kết thúc ca khám (Hoàn thành), hệ thống tự động ghi nhận khoản thưởng **5% doanh thu** của dịch vụ do nhân viên tiếp nhận này chỉ định, chuyển sang phân hệ Nhân sự (`/hr`) để tổng hợp vào bảng lương tháng.

---

## 4. Nguyên Tắc Kiểm Soát Nội Bộ
- **Cấm kiêm nhiệm (SoD):** Tài khoản Tiếp nhận (`RECEPTION_STAFF`) **tuyệt đối không được kiêm nhiệm Kế toán (`ACCOUNTING_STAFF`)** để tránh rủi ro vừa thu tiền vừa đối soát sổ quỹ.
