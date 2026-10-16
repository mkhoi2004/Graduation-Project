import { readFile, writeFile } from 'node:fs/promises'
import { createReceiptWorkbook, type ReceiptExportData } from '../../apps/web/src/features/reception/receipt-excel'

const templatePath = 'C:/Users/ADMIN/Documents/GitHub/Graduation-Project/apps/web/public/templates/phieu-thu-tien-template.xlsx'
const outputPath = 'C:/Users/ADMIN/Documents/GitHub/Graduation-Project/.tmp/receipt-template-builder/phieu-thu-tien-sample.xlsx'
const template = await readFile(templatePath)
const source = template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer
const data: ReceiptExportData = {
  receiptCode: 'TNK20261710/0001', patientCode: 'MBN20261710/0001', patientName: 'Nguyễn Văn An',
  dateOfBirth: '21/05/1990', phone: '0901 234 567', createdAt: '17/10/2026',
  rows: [
    { name: 'Cạo vôi + đánh bóng', unitPrice: 400_000, quantity: 1, amount: 400_000 },
    { name: 'Trám răng × 2', unitPrice: 300_000, quantity: 2, amount: 600_000 },
    { name: 'Tẩy trắng tại phòng', unitPrice: 3_000_000, quantity: 1, amount: 3_000_000 },
  ],
  total: 4_000_000,
  fileName: 'phieu-thu-tien-TNK20261710-0001.xlsx',
}
await writeFile(outputPath, await createReceiptWorkbook(source, data))
