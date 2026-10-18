# Thiết kế module Quản lý kho DentalERP

## Mục tiêu

Xây dựng khu vực `/warehouse` cho vai trò `WAREHOUSE_MANAGEMENT` và `ADMIN`, gồm ba màn hình: Tổng quan, Chi tiết vật tư và Nhập/Xuất kho. Module quản lý tồn theo lô, hạn dùng, giá vốn chưa VAT, lịch sử bất biến và liên kết dữ liệu bác sĩ/kế toán.

## Phạm vi đã thống nhất

- Vật tư dùng cho bệnh nhân chỉ phát sinh từ lượt khám đã hoàn thành; kho không nhập lại thủ công cùng nghiệp vụ.
- Khi hoàn tất khám, backend tự tạo phiếu xuất bệnh nhân ở trạng thái `POSTED` trong cùng transaction. Thiếu tồn làm toàn bộ thao tác hoàn tất thất bại và không cho phép tồn âm.
- Danh mục vật tư do Admin quản lý; Quản lý kho xem và thực hiện nghiệp vụ nhập/xuất.
- Ghi dữ liệu kế toán/outbox ngay trong giai đoạn này; màn hình kế toán triển khai sau.
- Phiếu dùng bản in HTML/PDF; báo cáo dùng Excel ở giai đoạn tiếp theo.
- Triển khai theo giai đoạn nhưng giai đoạn đầu phải dùng được: dữ liệu mẫu, dashboard, tra cứu, nhập kho, xuất kho, FEFO/FIFO, in và ghi sổ.

## Giao diện

### 1. Tổng quan `/warehouse`

- Thẻ KPI: tổng mã vật tư, tổng giá trị tồn, sắp hết hàng, sắp hết hạn.
- Danh sách cảnh báo tồn tối thiểu và hạn dùng.
- Nhóm tồn: vật tư thường, thuốc gây tê, văn phòng phẩm.
- Các chứng từ gần đây và trạng thái `DRAFT`, `PRINTED`, `POSTED`, `CANCELLED`.

### 2. Chi tiết `/warehouse/details`

- Tìm theo mã/tên, lọc nhóm, trạng thái tồn và hạn dùng.
- Bảng vật tư có tồn tổng, tồn khả dụng, đơn vị cơ sở, giá trị tồn.
- Mở rộng xem các lô, ngày nhập, hạn dùng, giá vốn và chứng từ nguồn.
- Bảng sử dụng cho bệnh nhân lấy từ `ExaminationSupply`, có bệnh nhân, bác sĩ, lượt khám và số lượng.

### 3. Nhập/Xuất kho `/warehouse/transactions`

- Danh sách chứng từ và bộ lọc.
- Form nhập kho: nhà cung cấp, dòng vật tư, đơn vị nhập, hệ số quy đổi, lô, hạn dùng, đơn giá chưa VAT, VAT.
- Form xuất kho thủ công: hủy/nội bộ, nơi nhận/lý do và các dòng vật tư. Phiếu bệnh nhân chỉ được sinh từ lượt khám.
- Phân bổ lô tự động FEFO; nếu không có hạn dùng thì FIFO. Không xuất lô hết hạn trừ chứng từ hủy.
- Nút lưu nháp, in, ghi sổ. Khi in sau lần đầu hiển thị `BẢN SAO` và lưu nhật ký in.

## Mô hình dữ liệu

- `Supplier`: danh mục nhà cung cấp.
- `MedicalSupply`: giữ tương thích với module bác sĩ, bổ sung tồn tối thiểu, số ngày cảnh báo, nhóm văn phòng phẩm và quy tắc đơn vị.
- `InventoryBatch`: tồn theo lô/hạn dùng/giá vốn; số lượng là số thập phân theo đơn vị cơ sở.
- `StockDocument`: đầu chứng từ nhập/xuất, đối tác/người nhận, trạng thái, tổng tiền, khóa idempotency và liên kết nghiệp vụ.
- `StockDocumentLine`: dòng vật tư, số lượng nhập, đơn vị, hệ số quy đổi, lô, hạn dùng, đơn giá chưa VAT và VAT.
- `StockAllocation`: phân bổ một dòng xuất vào các lô cụ thể.
- `StockLedgerEntry`: sổ kho bất biến cho mọi biến động.
- `WarehousePrintLog`: lần in, người in, thời gian và hash nội dung.
- `WarehouseAuditLog`: nhật ký thay đổi trạng thái/dữ liệu.
- `AccountingWarehouseEntry`: outbox kế toán cho công nợ mua hàng, chi phí sử dụng và tổn thất hủy.

Quan hệ chính:

```text
Supplier 1--n StockDocument 1--n StockDocumentLine n--1 MedicalSupply
MedicalSupply 1--n InventoryBatch
StockDocumentLine 1--n StockAllocation n--1 InventoryBatch
StockDocument 1--n StockLedgerEntry
StockDocument 1--n WarehousePrintLog
StockDocument 1--n AccountingWarehouseEntry
DoctorExamination 1--n ExaminationSupply n--1 MedicalSupply
```

## Quy tắc tính toán và trạng thái

- `convertedQuantity = inputQuantity * conversionFactor`.
- `goodsAmount = inputQuantity * inputUnitPrice`.
- `vatAmount = round(goodsAmount * vatRate / 100)`.
- `totalAmount = goodsAmount + vatAmount`; giá vốn lưu không gồm VAT.
- Mã phiếu nhập `MVTyyyyMMdd/NNNN`, phiếu xuất `XVTyyyyMMdd/NNNN`.
- Luồng chuẩn: `DRAFT -> PRINTED -> POSTED`; có thể hủy trước khi ghi sổ. Chứng từ đã ghi sổ chỉ điều chỉnh bằng chứng từ đảo, không sửa/xóa trực tiếp.
- Chứng từ đã `PRINTED` là bất biến; muốn thay nội dung phải hủy và tạo chứng từ mới. Mỗi lần in lại cùng hash được ghi lịch sử và đánh dấu `BẢN SAO`.
- Ghi sổ là transaction: khóa/idempotency, kiểm tra tồn, tạo/cập nhật lô, ghi ledger, cập nhật tồn tương thích trên `MedicalSupply`, tạo outbox kế toán.
- Vật tư bệnh nhân đã được trừ qua lượt khám phải dùng chung dịch vụ ghi sổ kho; không được trừ `MedicalSupply.inStock` lần thứ hai.
- `InventoryBatch.quantity` là số dư chuẩn dạng thập phân. `MedicalSupply.inStock` tạm là số nguyên tương thích cho module bác sĩ; giai đoạn đầu chỉ cho ghi sổ khi tổng đơn vị cơ sở là số nguyên và cập nhật hai nguồn trong cùng transaction.
- Outbox kế toán lưu loại sự kiện, tổng trước VAT/VAT/sau VAT, chứng từ, nhà cung cấp và `payloadJson` theo từng dòng để màn hình kế toán ánh xạ Nợ/Có sau này.
- `cancel` chỉ áp dụng cho `DRAFT/PRINTED`; chứng từ `POSTED` dùng chứng từ đảo có liên kết tới chứng từ gốc.

## API REST

- `GET /warehouse/overview`
- `GET /warehouse/items`
- `GET /warehouse/items/:id/batches`
- `GET /warehouse/usage`
- `GET /warehouse/documents`
- `POST /warehouse/documents/receipts`
- `POST /warehouse/documents/issues`
- `POST /warehouse/documents/:id/print`
- `POST /warehouse/documents/:id/post`
- `POST /warehouse/documents/:id/cancel`
- `POST /warehouse/documents/:id/reverse`

API được bảo vệ bởi JWT và role `WAREHOUSE_MANAGEMENT` hoặc `ADMIN`; DTO dùng `class-validator`/`class-transformer`.

## Dữ liệu mẫu

- Ít nhất ba nhà cung cấp.
- Vật tư ở cả ba nhóm, gồm: tồn bình thường, dưới mức tối thiểu, sắp hết hạn và đã hết hạn.
- Phiếu nhập/xuất ở các trạng thái khác nhau và ledger tương ứng cho chứng từ đã ghi sổ.
- Dữ liệu sử dụng bệnh nhân tiếp tục lấy từ seed của module bác sĩ.

## Kiểm thử bắt buộc

- Tính tiền, VAT và quy đổi đơn vị.
- FEFO/FIFO, bỏ lô hết hạn cho xuất thường, cho phép chọn lô hết hạn khi hủy.
- Không đủ tồn phải rollback toàn bộ.
- Idempotency không tạo giao dịch kép.
- Chuyển trạng thái và lịch sử in/bản sao.
- Phân quyền kho/Admin; role khác bị từ chối.
- UI hiển thị đủ ba tab, loading/empty/error và form nhập/xuất cơ bản.

## Không thuộc giai đoạn đầu

- Màn hình kế toán tiêu thụ outbox.
- Trình chỉnh sửa danh mục vật tư cho Admin.
- Xuất báo cáo Excel nâng cao và bộ lọc báo cáo theo kỳ.
- Quy trình kiểm kê toàn diện; nền tảng ledger/điều chỉnh phải cho phép bổ sung sau.
