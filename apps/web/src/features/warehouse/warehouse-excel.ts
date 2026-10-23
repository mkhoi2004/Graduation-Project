import JSZip from 'jszip'
import type { StockDocument, UsageItem, WarehouseItem } from './warehouse-api'

function xmlEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSimpleXlsx(sheetName: string, headers: string[], rows: (string | number)[][]): Promise<Uint8Array> {
  const zip = new JSZip()

  // [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
  )

  // _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
  )

  // xl/_rels/workbook.xml.rels
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  )

  // xl/workbook.xml
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
  )

  // xl/styles.xml
  zip.file(
    'xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><name val="Calibri"/><sz val="11"/></font>
    <font><b/><name val="Calibri"/><sz val="11"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>`,
  )

  // xl/worksheets/sheet1.xml
  let sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <sheetData>`

  // Header row (r=1)
  sheetXml += `<row r="1">`
  headers.forEach((h, colIdx) => {
    const colRef = String.fromCharCode(65 + (colIdx % 26)) + (colIdx >= 26 ? String(Math.floor(colIdx / 26)) : '') + '1'
    sheetXml += `<c r="${colRef}" s="1" t="str"><v>${xmlEscape(h)}</v></c>`
  })
  sheetXml += `</row>`

  // Data rows
  rows.forEach((row, rowIdx) => {
    const rNum = rowIdx + 2
    sheetXml += `<row r="${rNum}">`
    row.forEach((val, colIdx) => {
      const colRef = String.fromCharCode(65 + (colIdx % 26)) + (colIdx >= 26 ? String(Math.floor(colIdx / 26)) : '') + rNum
      if (typeof val === 'number') {
        sheetXml += `<c r="${colRef}" s="0"><v>${val}</v></c>`
      } else {
        sheetXml += `<c r="${colRef}" s="0" t="str"><v>${xmlEscape(val)}</v></c>`
      }
    })
    sheetXml += `</row>`
  })

  sheetXml += `</sheetData><pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="11" orientation="portrait" fitToWidth="1" fitToHeight="1"/></worksheet>`
  zip.file('xl/worksheets/sheet1.xml', sheetXml)

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

function triggerDownload(buffer: Uint8Array, fileName: string) {
  // Auto-save to Report/Kho
  import('../../lib/report-storage').then(({ saveExcelReportLocally }) => {
    saveExcelReportLocally('Kho', fileName, buffer).catch((err) => {
      console.warn('Lưu Excel vào Report thất bại:', err);
    });
  });

  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportWarehouseItemsToExcel(items: WarehouseItem[]): Promise<void> {
  const headers = [
    'Mã vật tư',
    'Tên vật tư',
    'Phân nhóm',
    'Đơn vị cơ bản',
    'Đơn vị quy đổi',
    'Tỷ lệ quy đổi',
    'Tồn kho khả dụng',
    'Tồn tối thiểu',
    'Tổng giá trị tồn (đ)',
    'Số lượng lô',
  ]

  const rows = items.map((i) => [
    i.code,
    i.name,
    i.group === 'THUONG' ? 'VTYT thường' : i.group === 'VO_CAM' ? 'VTYT vô cảm' : 'Văn phòng phẩm',
    i.baseUnit,
    i.conversionUnit || '—',
    i.conversionRate || 1,
    i.availableQuantity,
    i.minimumStock,
    i.inventoryValue,
    i.inventoryBatches.length,
  ])

  const buffer = await buildSimpleXlsx('TonKhoChiTiet', headers, rows)
  triggerDownload(buffer, `Danh-sach-vat-tu-ton-kho-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportUsageHistoryToExcel(usages: UsageItem[]): Promise<void> {
  const headers = [
    'Mã phiếu / Ca khám',
    'Nguồn phát sinh',
    'Mã vật tư',
    'Tên vật tư',
    'Đơn vị',
    'Số lượng',
    'Bác sĩ chỉ định / sử dụng',
    'Bệnh nhân',
    'Phòng khám / Ghế',
    'Số lô',
    'Thời gian sử dụng',
    'Đơn giá vốn (đ)',
    'Thành tiền vốn (đ)',
  ]

  const rows = usages.map((u) => [
    u.documentCode,
    u.sourceType === 'DOCTOR_EXAM' ? 'Ca khám bác sĩ' : 'Xuất kho bệnh nhân',
    u.supplyCode,
    u.supplyName,
    u.baseUnit,
    u.quantity,
    u.doctorName,
    `${u.patientName} (${u.patientCode})`,
    u.roomName,
    u.batchNo,
    new Date(u.usedAt).toLocaleString('vi-VN'),
    u.unitCost,
    u.totalAmount,
  ])

  const buffer = await buildSimpleXlsx('LichSuSuDung', headers, rows)
  triggerDownload(buffer, `Lich-su-su-dung-vat-tu-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function exportDocumentsToExcel(docs: StockDocument[]): Promise<void> {
  const headers = [
    'Mã phiếu',
    'Loại phiếu',
    'Hình thức xuất',
    'Trạng thái',
    'Nhà cung cấp / Nơi nhận',
    'Lý do',
    'Tiền hàng (đ)',
    'Tiền VAT (đ)',
    'Tổng thanh toán (đ)',
    'Số lần in',
    'Ngày lập',
  ]

  const rows = docs.map((d) => [
    d.code,
    d.type === 'IN' ? 'Nhập kho' : 'Xuất kho',
    d.outboundType === 'PATIENT_USE' ? 'Dùng cho bệnh nhân' : d.outboundType === 'DISPOSAL' ? 'Xuất hủy' : d.outboundType === 'INTERNAL' ? 'Cấp phát nội bộ' : '—',
    d.status === 'DRAFT' ? 'Nháp' : d.status === 'PRINTED' ? 'Đã in' : d.status === 'POSTED' ? 'Đã ghi sổ' : 'Đã hủy',
    d.supplier?.name || d.recipientDepartment || '—',
    d.reason || '—',
    d.goodsAmount,
    d.vatAmount,
    d.totalAmount,
    d.printCount,
    new Date(d.createdAt).toLocaleDateString('vi-VN'),
  ])

  const buffer = await buildSimpleXlsx('ChungTuKho', headers, rows)
  triggerDownload(buffer, `Danh-sach-chung-tu-kho-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
