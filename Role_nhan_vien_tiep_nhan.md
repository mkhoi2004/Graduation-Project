# Role nhân viên tiếp nhận

Sau khi đăng nhập, chuyển qua `/reception`:

## 1. Tạo/cập nhật thông tin hồ sơ bệnh nhân
- Tạo tên, tuổi, số điện thoại,…
- Nếu đã có thì **không tạo lại** mà có thể chỉnh sửa/cập nhật thông tin.
- Khi tạo sẽ sinh ra **1 mã bệnh nhân**, bắt đầu bằng `MBN`:
  - Định dạng: `MBN-Năm/tháng/ngày/(Từ 0001-9999)`
  - Ví dụ: `MBN20261610/0001`

## 2. Tạo tiếp nhận
- Tạo hồ sơ bệnh nhân mới để họ có thể khám.
- Mã tiếp nhận bắt đầu theo quy tắc `TNK`:
  - Định dạng: `TNK-Năm/tháng/ngày/(Từ 0001-9999)`
  - Ví dụ: `TNK20261610/0001` (đầu tiên trong hôm nay), sau đó `TNK20261610/0002`,…
- **1 người có thể có nhiều TNK khác nhau**.

## 3. Chọn dịch vụ

### Điều trị cơ bản
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|---------|-------------|
| Cạo vôi + đánh bóng | 400.000 VNĐ | 2 hàm |
| Trám răng | 300.000 VNĐ | 1 chiếc |
| Lấy tủy răng cửa | 2.000.000 VNĐ | 1 chiếc |
| Lấy tủy răng hàm | 3.000.000 VNĐ | 1 chiếc |
| Nhổ răng thường | 300.000 VNĐ | 1 chiếc |
| Nhổ răng khôn | 500.000 VNĐ | 1 chiếc |

### Thẩm mỹ và phục hình
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|---------|-------------|
| Tẩy trắng tại phòng | 3.000.000 VNĐ | 2 hàm |
| Khay tẩy tại nhà | 1.500.000 VNĐ | 2 hàm |
| Răng sứ kim loại | 1.500.000 VNĐ | 1 cái |
| Răng toàn sứ | 8.000.000 VNĐ | 1 cái |
| Răng toàn sứ cao cấp | 15.000.000 VNĐ | 1 cái |

### Niềng và implant
| Dịch vụ | Đơn giá | Đơn vị tính |
|---------|---------|-------------|
| Niềng mắc cài kim loại | 40.000.000 VNĐ | 2 hàm |
| Niềng mắc cài sứ / tự buộc | 50.000.000 VNĐ | 2 hàm |
| Niềng khay trong suốt | 70.000.000 VNĐ | 2 hàm |

**Lưu ý:**
- Có thể có nút **Hủy** để bỏ các dịch vụ đã chọn.
- Khi chọn dịch vụ sẽ có **phòng khám** và **tên bác sĩ** thực hiện.

## 4. In phiếu
- Có nút in phiếu (chức năng sẽ làm sau).

## 5. Chuyển sang Bác Sĩ
- Sau khi hoàn tất tiếp nhận, chuyển sang bước Bác Sĩ.