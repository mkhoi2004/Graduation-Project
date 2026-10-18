import { getSession } from '../../lib/auth-session'

export interface SummaryExportData {
  examinationCode: string
  patientCode: string
  patientName: string
  dateOfBirth: string
  phone: string
  createdAt: string
  services: { name: string; quantity: number; unit?: string }[]
  summary: string
  treatmentMethod: string
  treatmentOrientation: string
  nextAppointmentDate?: string
  doctorName?: string
  roomName?: string
  fileName: string
}

function formatVietnameseDate(value?: string): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function safeFileSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function buildSummaryExportData(examination: {
  id: number
  code: string
  startedAt: string
  patient: {
    code: string
    fullName: string
    dateOfBirth: string
    phone: string
  }
  intake?: {
    roomName?: string
    services?: { name: string; quantity: number; unit?: string }[]
  }
  result?: {
    summary: string
    treatmentMethod: string
    treatmentOrientation: string
    nextAppointmentDate?: string
  }
}, doctorName = 'BS. Phụ trách'): SummaryExportData {
  const result = examination.result ?? {
    summary: 'Chưa cập nhật',
    treatmentMethod: 'Chưa cập nhật',
    treatmentOrientation: 'Chưa cập nhật',
    nextAppointmentDate: undefined,
  }

  return {
    examinationCode: examination.code,
    patientCode: examination.patient.code,
    patientName: examination.patient.fullName,
    dateOfBirth: formatVietnameseDate(examination.patient.dateOfBirth),
    phone: examination.patient.phone,
    createdAt: new Date(examination.startedAt).toLocaleDateString('vi-VN'),
    services: examination.intake?.services ?? [],
    summary: result.summary,
    treatmentMethod: result.treatmentMethod,
    treatmentOrientation: result.treatmentOrientation,
    nextAppointmentDate: formatVietnameseDate(result.nextAppointmentDate),
    doctorName,
    roomName: examination.intake?.roomName,
    fileName: `phieu-ket-qua-${safeFileSegment(examination.code)}.xlsx`,
  }
}

const firstServiceRow = 9
const lastServiceRow = 28

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function replaceCell(xml: string, reference: string, body: string, type?: 'str'): string {
  const pattern = new RegExp(`<x:c r="${reference}"([^>]*?)(?:\\s*/>|>[\\s\\S]*?<\\/x:c>)`)
  const match = pattern.exec(xml)
  if (!match) throw new Error(`Mẫu Excel thiếu ô ${reference}.`)
  const style = /\s+s="([^"]+)"/.exec(match[1])?.[1]
  const attributes = `${style ? ` s="${style}"` : ''}${type ? ` t="${type}"` : ''}`
  return xml.replace(pattern, `<x:c r="${reference}"${attributes}>${body}</x:c>`)
}

function stringCell(xml: string, reference: string, value: string): string {
  return replaceCell(xml, reference, `<x:v>${escapeXml(value)}</x:v>`, 'str')
}

function clearCell(xml: string, reference: string): string {
  return replaceCell(xml, reference, '')
}

export function fillSummarySheetXml(sourceXml: string, data: SummaryExportData): string {
  // Replace Title cleanly using stringCell without generating duplicate XML attributes
  const title = 'Kết Quả Khám & Điều Trị'
  let xml = stringCell(sourceXml, 'C2', title)
  xml = stringCell(xml, 'D2', title)
  xml = stringCell(xml, 'E2', title)
  xml = stringCell(xml, 'F2', title)

  // Header information
  xml = stringCell(xml, 'G2', `Họ tên: ${data.patientName}`)
  xml = stringCell(xml, 'G3', `Ngày sinh: ${data.dateOfBirth || 'Chưa cập nhật'}`)
  xml = stringCell(xml, 'G4', `Mã bệnh nhân: ${data.patientCode}`)
  xml = stringCell(xml, 'A5', `Mã phiếu: ${data.examinationCode}`)
  xml = stringCell(xml, 'G5', `Ngày lập: ${data.createdAt}`)

  // Table Headers (Row 8)
  xml = stringCell(xml, 'A8', 'Nội dung điều trị & Kết luận chuyên môn')
  xml = stringCell(xml, 'E8', 'Chi tiết / Ghi chú')
  xml = stringCell(xml, 'G8', 'Trạng thái')

  // Clear rows 9 to 28
  for (let rowNumber = firstServiceRow; rowNumber <= lastServiceRow; rowNumber += 1) {
    xml = clearCell(xml, `A${rowNumber}`)
    xml = clearCell(xml, `E${rowNumber}`)
    xml = clearCell(xml, `G${rowNumber}`)
    xml = clearCell(xml, `I${rowNumber}`)
  }

  let currentRow = firstServiceRow

  // 1. Dịch vụ đã chỉ định
  if (data.services.length > 0) {
    xml = stringCell(xml, `A${currentRow}`, '★ CÁC DỊCH VỤ THỰC HIỆN:')
    currentRow += 1
    for (const service of data.services) {
      if (currentRow <= lastServiceRow) {
        xml = stringCell(xml, `A${currentRow}`, `  • ${service.name} (SL: ${service.quantity} ${service.unit ?? ''})`.trim())
        xml = stringCell(xml, `G${currentRow}`, 'Đã thực hiện')
        currentRow += 1
      }
    }
  }

  // 2. Tóm tắt kết quả
  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '1. TÓM TẮT KẾT QUẢ KHÁM:')
    xml = stringCell(xml, `E${currentRow}`, data.summary)
    currentRow += 1
  }

  // 3. Phương pháp điều trị
  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '2. PHƯƠNG PHÁP ĐIỀU TRỊ:')
    xml = stringCell(xml, `E${currentRow}`, data.treatmentMethod)
    currentRow += 1
  }

  // 4. Hướng điều trị tiếp theo
  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '3. HƯỚNG ĐIỀU TRỊ TIẾP THEO:')
    xml = stringCell(xml, `E${currentRow}`, data.treatmentOrientation)
    currentRow += 1
  }

  // 5. Ngày hẹn tái khám
  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '4. HẸN TÁI KHÁM:')
    xml = stringCell(xml, `E${currentRow}`, data.nextAppointmentDate ? `Ngày hẹn: ${data.nextAppointmentDate}` : 'Không hẹn tái khám')
    currentRow += 1
  }

  // Bottom Footer (Row 30 & Row 32)
  xml = stringCell(xml, 'A30', `Bác sĩ khám: ${data.doctorName ?? 'Bác sĩ điều trị'}`)
  xml = clearCell(xml, 'G30')
  xml = stringCell(xml, 'A32', 'Chúc quý khách hồi phục nhanh chóng & nụ cười luôn tự tin!')

  return xml
}

export async function createSummaryWorkbook(template: ArrayBuffer, data: SummaryExportData): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(template)
  const sheetPath = 'xl/worksheets/sheet1.xml'
  const sheetFile = zip.file(sheetPath)
  if (!sheetFile) throw new Error('Mẫu Excel không có dữ liệu trang phiếu kết quả.')
  const sheetXml = await sheetFile.async('string')
  let filledXml = fillSummarySheetXml(sheetXml, data)
  if (!filledXml.includes('paperSize="11"')) {
    if (filledXml.includes('<x:pageSetup')) {
      filledXml = filledXml.replace(/<x:pageSetup[^>]*\/>/, '<x:pageSetup paperSize="11" orientation="portrait" fitToWidth="1" fitToHeight="1"/>')
    } else if (filledXml.includes('<x:pageMargins')) {
      filledXml = filledXml.replace(/<x:pageMargins[^>]*\/>/, '$&<x:pageSetup paperSize="11" orientation="portrait" fitToWidth="1" fitToHeight="1"/>')
    }
  }
  zip.file(sheetPath, filledXml)

  const workbookPath = 'xl/workbook.xml'
  const workbookFile = zip.file(workbookPath)
  if (workbookFile) {
    let workbookXml = await workbookFile.async('string')
    workbookXml = workbookXml.replace('name="Phiếu thu tiền"', 'name="Phiếu kết quả"')
    if (!workbookXml.includes('<x:calcPr')) {
      workbookXml = workbookXml.replace('</x:workbook>', '<x:calcPr fullCalcOnLoad="1" /></x:workbook>')
    }
    zip.file(workbookPath, workbookXml)
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function downloadSummaryWorkbook(
  examination: any,
  doctorName?: string,
  onPrinted?: () => Promise<void>,
): Promise<void> {
  const effectiveDoctor = doctorName || getSession()?.user?.fullName || 'BS. Điều trị'
  const data = buildSummaryExportData(examination, effectiveDoctor)
  const response = await fetch('/templates/phieu-ket-qua-tong-ket-template.xlsx')
  if (!response.ok) throw new Error('Không tải được mẫu phiếu kết quả tổng kết.')

  const template = await response.arrayBuffer()
  const buffer = await createSummaryWorkbook(template, data)
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = data.fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)

  if (onPrinted) {
    try {
      await onPrinted()
    } catch (err) {
      console.error('Không thể ghi lại lịch sử in:', err)
    }
  }
}
