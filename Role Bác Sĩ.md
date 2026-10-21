# Role Bác Sĩ (DentalKhoi ERP)

**Role bác sĩ lâm sàng:**

Sau khi từ phòng Tiếp nhận (`/reception`) (Trạng thái: **Tiếp nhận**) chuyển sang Bác sĩ (`/doctor`) (Trạng thái: **Đang khám**):

---

## 1. Danh Mục Tài Khoản Bác Sĩ Thực Tế
Phòng khám vận hành với 3 Bác sĩ chính quy trực tại 3 ghế/phòng điều trị chuyên biệt:
- **BS. CKI. Nguyễn Hoàng Minh** (`doctor-minh`, alias: `doctor`): Bác sĩ CKI Nha khoa tổng quát & Phục hình — Trực tại **Phòng khám 01** (`room-01`).
- **BS. ThS. Trần Ngọc Lan** (`doctor-lan`): Bác sĩ Thạc sĩ Thẩm mỹ & Chỉnh nha — Trực tại **Phòng khám 02** (`room-02`).
- **BS. CKI. Lê Quốc Huy** (`doctor-huy`): Bác sĩ CKI Tiểu phẫu & Cấy ghép Implant — Trực tại **Phòng tiểu phẫu** (`room-03`).

---

## 2. Nút Chấm Công Check-in / Check-out Trên Header Chung
- Nút **Check-in / Check-out** xuất hiện cố định ở **thanh đầu trang dùng chung (Header)** của màn hình `/doctor`, hoạt động tốt trên cả máy tính và di động.
- Giờ lấy từ máy chủ phòng khám (`Asia/Ho_Chi_Minh`), mỗi ngày 1 bản ghi duy nhất, lần bấm đầu tiên là giờ gốc không bị ghi đè.
- **Quy tắc đặc thù khi Bác sĩ Check-out:**
  - Nếu bác sĩ đang có ca ở trạng thái **Đang khám** (`IN_PROGRESS`) hoặc ca chưa Ghi sổ: Hệ thống sẽ hiển thị **hộp thoại cảnh báo xác nhận** trước khi Check-out ("Bác sĩ hiện đang có ca khám dở dang chưa hoàn thành. Bạn có chắc chắn muốn Check-out không?").
  - Nếu bác sĩ xác nhận đồng ý, hệ thống vẫn ghi nhận Check-out và lưu audit log cảnh báo (không chặn cứng để đảm bảo tính linh hoạt thực tế).

---

## 3. Quy Tắc Chung Trong Ca Khám (Áp dụng cho mọi bước)
- Nút **Từ chối (chuyển trạng thái: Ngừng khám)** nằm ở thanh thao tác chung, bác sĩ bấm được **ở mọi bước** từ Bước 1 đến Bước 4. Khi bấm bắt buộc nhập **lý do** (chống chỉ định, huyết áp cao, bệnh nhân bỏ về, bệnh nhân không đồng ý điều trị...).
- Mỗi bác sĩ chỉ có **1 bệnh nhân ở trạng thái Đang khám** tại một thời điểm.
- Bác sĩ **chỉ thực hiện đúng các dịch vụ do `/reception` lập từ ban đầu**, không thêm, sửa hay xóa dịch vụ tại `/doctor`.
- **Giá VTYT không hiển thị cho bác sĩ** và **không cộng vào hóa đơn bệnh nhân**. Giá chỉ dùng nội bộ nha khoa để tính giá vốn.
- **Phân trang:** Cố định **10 dòng / trang** trên tất cả bảng danh sách hàng đợi và lịch sử ca khám.

---

## 4. Quy Trình Khám Bệnh 4 Bước

### Bước 1: Bắt đầu khám
- Màn hình hiển thị hàng chờ hôm nay của **phòng được phân ca cho bác sĩ**, chỉ gồm TNK trạng thái **Tiếp nhận** gán cho chính bác sĩ đó. Phòng do máy chủ xác định, bác sĩ không tự đổi phòng.
- Mỗi dòng có STT 4 chữ số, bệnh nhân, dịch vụ, mức ưu tiên và lý do. Chỉ có hai mức **Thường** và **Ưu tiên**; bệnh nhân Ưu tiên được tô nổi bật và đầu danh sách hiển thị tổng số người ưu tiên đang chờ.
- Danh sách luôn xếp STT tăng dần. Mức Ưu tiên chỉ để nhận biết, không tự thay đổi thứ tự gọi.
- Nút **Gọi STT tiếp theo** lấy nguyên tử TNK có STT nhỏ nhất của bác sĩ; dù chỉ có một bệnh nhân vẫn phải bấm Gọi. Sau khi gọi, TNK chuyển **Đang khám**, lưu người/giờ gọi và cập nhật **STT đang gọi**.
- **Chặn nút Gọi** khi bác sĩ còn bệnh nhân Đang khám; hai thao tác đồng thời không được gọi trùng một bệnh nhân. Hết hàng chờ báo **“Không còn bệnh nhân chờ”**.
- Nút **Vắng mặt** chỉ xuất hiện cho bệnh nhân vừa gọi nhưng chưa có VTYT, kết quả hoặc lịch sử in/Ghi sổ. Sau xác nhận, TNK kết thúc ở trạng thái **Vắng mặt**, STT không tái sử dụng và hệ thống tự gọi STT kế tiếp.
- Nếu đã có dữ liệu khám thì không dùng Vắng mặt, phải dùng **Ngừng khám**. Vắng mặt có doanh thu và thưởng bằng 0; khoản thu trước được chuyển Kế toán xử lý như Ngừng khám. Mọi thao tác gọi/Vắng mặt được ghi audit log.

### Bước 2: Chọn VTYT trong lúc/sau khi khám
VTYT được chia thành **2 nhóm riêng** trên giao diện, bác sĩ có thể nhập **bất kỳ lúc nào trong trạng thái Đang khám**:
- **Nhóm VTYT thường:** Găng tay cao su có bột Vglove (Khải Hoàn, Việt Nam) (1 Cái); Composite đặc 3M Filtek Z350 XT (Mỹ) (1 Tuýp); Composite đặc MANI Nano (Nhật) (1 Tuýp); Côn gutta máy Meta Biomed 4%–6% (Hàn Quốc) (1 Hộp quy đổi = 60 Cái cơ bản); Xi măng gắn RelyX U200 (3M) (1 Tuýp).
- **Nhóm VTYT vô cảm:** Kim tiêm Septoject (Septodont, Pháp) (1 Hộp = 100 Kim); Kim tiêm gây tê Shinject (Shinhung) (1 Hộp = 100 Kim); Kim tiêm tê Terumo (1 Hộp = 100 Kim); Bơm tiêm áp lực Osung 1.8cc (1 Bơm); Septanest with Adrenaline 1/100.000 (Septodont, Pháp), articaine 4% (1 Hộp = 50 Ống).

**Cách chọn và nhập:**
1. Chọn loại VTYT.
2. Nếu VTYT **có đơn vị quy đổi**: chọn đơn vị quy đổi trước (VD: *Hộp Septoject*), sau đó nhập **số lượng theo đơn vị cơ bản** (VD: *nhập số Kim*). Giao diện hiển thị rõ dạng "Hộp Septoject – nhập số Kim".
3. Nếu VTYT **chỉ có đơn vị cơ bản** (Găng tay, Composite, Xi măng, Bơm tiêm Osung): bỏ qua bước chọn quy đổi, nhập số lượng trực tiếp.
4. Hệ thống kiểm tra **số lượng tồn** trước khi cho nhập. Ví dụ: hộp 60 cái đã dùng 30 thì còn 30 và vẫn tiếp tục dùng được.

**Quy tắc tồn kho:**
- **Thời điểm trừ kho:** trừ khi **Ghi sổ (Hoàn thành hoặc Ngừng khám)**. Trước đó chỉ "giữ chỗ" số lượng.
- **Tồn không đủ** (VD: cần 40, còn lẻ 30): hệ thống tự lấy tiếp từ hộp mới nguyên nếu còn; nếu không còn hộp nào thì chặn và báo "Không đủ tồn kho".
- **Tồn = 0 hoặc âm:** không cho chọn.
- **Sửa/xóa VTYT đã nhập:** bác sĩ được sửa/xóa trước khi Ghi sổ. Số lượng giữ chỗ được hoàn lại tương ứng.
- Giá, tồn kho, số lượng tồn và tồn âm/dương chỉ xem và quản lý ở `/warehouse` (Quản lý kho).

### Bước 3: Nhập kết quả tổng kết
- Bác sĩ nhập: Tóm tắt kết quả, Phương pháp điều trị, Hướng điều trị, Ngày hẹn tái khám.
- Thông tin này dùng để **In Phiếu Kết quả tổng kết** chuẩn A5 cho người bệnh mang về.
- Có thể in **trước khi Ghi sổ**. Mỗi lần in được **lưu lịch sử**.
- Ngày hẹn chỉ dùng để **in ra giấy**, hệ thống **không tạo lịch hẹn tự động** cho `/reception`.
- Nút **Từ chối (Ngừng khám)** vẫn khả dụng ở bước này theo quy tắc chung.

### Bước 4: Ghi sổ & Tự Động Tính Thưởng
*Trường hợp khám bình thường:*
- Chuyển trạng thái sang **Hoàn thành**, rồi chuyển dữ liệu sang `/accounting`:
  - **Doanh thu dịch vụ**: số tiền dịch vụ do `/reception` lập (hóa đơn bệnh nhân).
  - **Giá vốn VTYT**: chi phí vật tư tiêu hao thực tế, tính theo giá nhập của nha khoa. Khoản này **không nằm trong hóa đơn bệnh nhân**.
- **Thưởng hoa hồng 5% Bác sĩ:** Hệ thống tự động ghi nhận một bản ghi thưởng dịch vụ chuyên môn trị giá **5% doanh thu** của ca khám cho Bác sĩ thực hiện, sẵn sàng đồng bộ vào bảng lương tháng tại `/hr`.
- Bút toán chỉ chuyển sang `/accounting` **khi quá trình khám hoàn tất**, vì khi đó số tiền mới chốt.

*Trường hợp Từ chối (Ngừng khám):*
- Doanh thu dịch vụ chuyển sang `/accounting` = **0** (chưa hoàn thành dịch vụ, không tính thưởng).
- Nếu đã dùng VTYT, vẫn chuyển **giá vốn VTYT đã tiêu hao** sang `/accounting` để ghi nhận chi phí tổn thất vật tư.
- Nếu bệnh nhân **đã thanh toán trước ở `/reception`**: khoản này chuyển thành thu trước chờ kế toán đối trừ hoặc hoàn tiền.

*Sau Ghi sổ:*
- Dữ liệu bị **khóa**, bác sĩ không tự sửa được. Chỉ vai trò có thẩm quyền (Quản lý/Admin) mới mở khóa, mọi chỉnh sửa đều **lưu lịch sử kiểm toán (audit log)**.

---

## 5. Ví Dụ Minh Họa
Bệnh nhân tiếp nhận khám răng, dịch vụ **300.000 VNĐ** (do `/reception` lập). Bác sĩ gọi vào và khám xong, nhập VTYT tiêu hao có giá vốn **100.000 VNĐ**. Khi Ghi sổ:
1. `/accounting` nhận:
   - Doanh thu dịch vụ: **300.000 VNĐ** (ghi nhận hiệu quả)
   - Giá vốn VTYT: **100.000 VNĐ** (chi phí nội bộ)
   - Lãi gộp ca này: **200.000 VNĐ** (300.000 − 100.000)
2. `/hr` nhận:
   - Thưởng Bác sĩ: $300.000 \times 5\% = \mathbf{15.000 \text{ VNĐ}}$
   - Thưởng Tiếp nhận: $300.000 \times 5\% = \mathbf{15.000 \text{ VNĐ}}$
