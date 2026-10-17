# Role Bác Sĩ

**Role bác sĩ:**

Sau khi từ phòng Tiếp nhận (/reception) (Trạng thái: **Tiếp nhận**) chuyển sang Bác sĩ (/doctor) (Trạng thái: **Đang khám**):

**Quy tắc chung (áp dụng cho mọi bước):**

- Nút **Từ chối (chuyển trạng thái: Ngừng khám)** nằm ở thanh thao tác chung, bác sĩ bấm được **ở mọi bước** từ Bước 1 đến Bước 4. Khi bấm cần nhập **lý do** (chống chỉ định, bệnh nhân bỏ về, bệnh nhân không đồng ý điều trị...).
- Mỗi bác sĩ chỉ có **1 bệnh nhân ở trạng thái Đang khám** tại một thời điểm.
- Bác sĩ **chỉ thực hiện đúng các dịch vụ do /reception lập từ ban đầu**, không thêm, sửa hay xóa dịch vụ tại /doctor.
- **Giá VTYT không hiển thị cho bác sĩ** và **không cộng vào hóa đơn bệnh nhân**. Giá chỉ dùng nội bộ nha khoa để tính giá vốn.

**Bước 1: Bắt đầu khám**

- Bác sĩ đang trực bấm nút **Gọi STT tiếp theo** khi **phòng của bác sĩ đó** có bệnh nhân ở trạng thái Tiếp nhận.
- Nếu chỉ có 1 bệnh nhân thì vẫn phải bấm Gọi để bắt đầu khám, tránh tự động chuyển trạng thái ngoài ý muốn.
- **Chặn nút Gọi** khi bệnh nhân hiện tại chưa Hoàn thành hoặc Ngừng khám.
- Sau khi gọi, đưa bệnh nhân vào và chuyển trạng thái sang **Đang khám**.

**Bước 2: Chọn VTYT trong lúc/sau khi khám**

VTYT được chia thành **2 nhóm riêng** trên giao diện, bác sĩ có thể nhập **bất kỳ lúc nào trong trạng thái Đang khám**:

- **Nhóm VTYT thường:** Găng tay cao su có bột Vglove (Khải Hoàn, Việt Nam) (1 Cái); Composite đặc 3M Filtek Z350 XT (Mỹ) (1 Tuýp); Composite đặc MANI Nano (Nhật) (1 Tuýp); Côn gutta máy Meta Biomed 4%–6% (Hàn Quốc) (1 Hộp quy đổi = 60 Cái cơ bản); Xi măng gắn RelyX U200 (3M) (1 Tuýp).
- **Nhóm VTYT vô cảm:** Kim tiêm Septoject (Septodont, Pháp) (1 Hộp = 100 Kim); Kim tiêm gây tê Shinject (Shinhung) (1 Hộp = 100 Kim); Kim tiêm tê Terumo (1 Hộp = 100 Kim); Bơm tiêm áp lực Osung 1.8cc (1 Bơm); Septanest with Adrenaline 1/100.000 (Septodont, Pháp), articaine 4% (1 Hộp = 50 Ống).

Cách chọn và nhập:

1.  Chọn loại VTYT.
2.  Nếu VTYT **có đơn vị quy đổi**: chọn đơn vị quy đổi trước (VD: *Hộp Septoject*), sau đó nhập **số lượng theo đơn vị cơ bản** (VD: *nhập số Kim*). Giao diện hiển thị rõ dạng "Hộp Septoject – nhập số Kim".
3.  Nếu VTYT **chỉ có đơn vị cơ bản** (Găng tay, Composite, Xi măng, Bơm tiêm Osung): bỏ qua bước chọn quy đổi, nhập số lượng trực tiếp.
4.  Hệ thống kiểm tra **số lượng tồn** trước khi cho nhập. Ví dụ: hộp 60 cái đã dùng 30 thì còn 30 và vẫn tiếp tục dùng được.

Quy tắc tồn kho:

- **Thời điểm trừ kho:** trừ khi **Ghi sổ (Hoàn thành hoặc Ngừng khám)**. Trước đó chỉ "giữ chỗ" số lượng.
- **Tồn không đủ** (VD: cần 40, còn lẻ 30): hệ thống tự lấy tiếp từ hộp mới nguyên nếu còn; nếu không còn hộp nào thì chặn và báo "Không đủ tồn kho".
- **Tồn = 0 hoặc âm:** không cho chọn.
- **Sửa/xóa VTYT đã nhập:** bác sĩ được sửa/xóa trước khi Ghi sổ. Số lượng giữ chỗ được hoàn lại tương ứng.
- Giá, tồn kho, số lượng tồn và tồn âm/dương chỉ xem và quản lý ở /warehouse (Quản lý kho).

**Bước 3: Nhập kết quả tổng kết**

- Bác sĩ nhập: Tóm tắt kết quả, Phương pháp điều trị, Hướng điều trị, Ngày hẹn.
- Thông tin này dùng để **In Phiếu Kết quả tổng kết** cho người bệnh mang về (template giống In Phiếu ở /reception, nhưng thay phần giá thành bằng 4 nội dung trên).
- Có thể in **trước khi Ghi sổ**. Mỗi lần in được **lưu lịch sử**.
- Ngày hẹn chỉ dùng để **in ra giấy**, hệ thống **không tạo lịch hẹn tự động** cho /reception.
- Nút **Từ chối (Ngừng khám)** vẫn khả dụng ở bước này theo quy tắc chung.

**Bước 4: Ghi sổ**

*Trường hợp khám bình thường:*

- Chuyển trạng thái sang **Hoàn thành**, rồi chuyển sang /accounting:
  - **Doanh thu dịch vụ**: số tiền dịch vụ do /reception lập (hóa đơn bệnh nhân).
  - **Giá vốn VTYT**: chi phí vật tư tiêu hao thực tế, tính theo giá nhập của nha khoa. Khoản này **không nằm trong hóa đơn bệnh nhân**.
- Bút toán chỉ chuyển sang /accounting **khi quá trình khám hoàn tất**, vì khi đó số tiền mới chốt.

*Trường hợp Từ chối (Ngừng khám):*

- Doanh thu dịch vụ chuyển sang /accounting = **0** (chưa hoàn thành dịch vụ).
- Nếu đã dùng VTYT, vẫn chuyển **giá vốn VTYT đã tiêu hao** sang /accounting để ghi nhận chi phí.
- Nếu bệnh nhân **đã thanh toán trước ở /reception**: khoản này **không ghi nhận vào /accounting ngay lúc thanh toán**. Bút toán chỉ được chuyển sang /accounting khi quá trình kết thúc (Hoàn thành hoặc Ngừng khám), kèm số tiền thực tế đã chốt. Khoản đã thu nhưng dịch vụ chưa thực hiện được ghi nhận theo kết quả cuối cùng (hoàn lại hoặc chuyển trừ lần sau).

*Sau Ghi sổ:*

- Dữ liệu bị **khóa**, bác sĩ không tự sửa được. Chỉ vai trò có quyền cao hơn (VD: quản lý) mới mở khóa, mọi chỉnh sửa đều **lưu lịch sử**.

**Ví dụ minh họa:**  
Bệnh nhân tiếp nhận khám răng, dịch vụ **300.000** (do /reception lập, đây là số tiền bệnh nhân phải trả). Bác sĩ gọi vào và khám xong, nhập VTYT tiêu hao có giá vốn **300.000** (chi phí nội bộ, bệnh nhân không bị tính thêm). Khi Ghi sổ, /accounting nhận:

- Doanh thu dịch vụ: **300.000** (thu)
- Giá vốn VTYT: **300.000** (chi)
- Chênh lệch của ca này: **0** (300.000 - 300.000)

Cuối tháng (hoặc theo kỳ khác), kế toán dựa trên các bản ghi này để tính tổng thu chi.
