import { dentalServices, type Intake, type Patient } from './reception-data'

export interface ReceiptServiceRow {
  name: string
  unitPrice: number
  quantity: number
  amount: number
}

export interface ReceiptExportData {
  receiptCode: string
  patientCode: string
  patientName: string
  dateOfBirth: string
  phone: string
  createdAt: string
  rows: ReceiptServiceRow[]
  total: number
  fileName: string
}

function formatVietnameseDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

function safeFileSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function buildReceiptExportData(patient: Patient, intake: Intake): ReceiptExportData {
  const rows = intake.services.flatMap((selection) => {
    const service = dentalServices.find((item) => item.id === selection.serviceId)
    if (!service || selection.quantity <= 0) return []
    return [{
      name: selection.quantity > 1 ? `${service.name} × ${selection.quantity}` : service.name,
      unitPrice: service.price,
      quantity: selection.quantity,
      amount: service.price * selection.quantity,
    }]
  })
  if (!rows.length) throw new Error('Phiếu chưa có dịch vụ hợp lệ để in.')

  return {
    receiptCode: intake.id,
    patientCode: patient.id,
    patientName: patient.fullName,
    dateOfBirth: formatVietnameseDate(patient.dateOfBirth),
    phone: patient.phone,
    createdAt: new Date(intake.createdAt).toLocaleDateString('vi-VN'),
    rows,
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    fileName: `phieu-thu-tien-${safeFileSegment(intake.id)}.xlsx`,
  }
}

const firstServiceRow = 9
const lastServiceRow = 28

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
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

function numberCell(xml: string, reference: string, value: number): string {
  return replaceCell(xml, reference, `<x:v>${value}</x:v>`)
}

function formulaCell(xml: string, reference: string, formula: string, value: number): string {
  return replaceCell(xml, reference, `<x:f>${formula}</x:f><x:v>${value}</x:v>`)
}

function clearCell(xml: string, reference: string): string {
  return replaceCell(xml, reference, '')
}

export function fillReceiptSheetXml(sourceXml: string, data: ReceiptExportData): string {
  if (data.rows.length > lastServiceRow - firstServiceRow + 1) {
    throw new Error('Phiếu có quá nhiều dịch vụ so với số dòng của mẫu Excel.')
  }

  let xml = stringCell(sourceXml, 'G2', `Họ tên: ${data.patientName}`)
  xml = stringCell(xml, 'G3', `Ngày sinh: ${data.dateOfBirth || 'Chưa cập nhật'}`)
  xml = stringCell(xml, 'G4', `Mã bệnh nhân: ${data.patientCode}`)
  xml = stringCell(xml, 'A5', `Mã phiếu: ${data.receiptCode}`)
  xml = stringCell(xml, 'G5', `Ngày lập: ${data.createdAt}`)

  for (let rowNumber = firstServiceRow; rowNumber <= lastServiceRow; rowNumber += 1) {
    xml = clearCell(xml, `A${rowNumber}`)
    xml = clearCell(xml, `E${rowNumber}`)
    xml = clearCell(xml, `G${rowNumber}`)
    xml = clearCell(xml, `I${rowNumber}`)
  }

  data.rows.forEach((row, index) => {
    const rowNumber = firstServiceRow + index
    xml = stringCell(xml, `A${rowNumber}`, row.name)
    xml = numberCell(xml, `E${rowNumber}`, row.unitPrice)
    xml = formulaCell(xml, `G${rowNumber}`, `E${rowNumber}*${row.quantity}`, row.amount)
  })

  xml = formulaCell(xml, 'G30', `SUM(G${firstServiceRow}:G${lastServiceRow})`, data.total)
  if (xml.includes('r="A32"')) {
    xml = stringCell(xml, 'A32', 'Cảm ơn quý khách đã sử dụng dịch vụ tại DentalKhoi.')
  }
  xml = xml.replace(/DentalERP/g, 'DentalKhoi')
  return xml
}

export async function createReceiptWorkbook(template: ArrayBuffer, data: ReceiptExportData): Promise<Uint8Array> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(template)
  const sheetPath = 'xl/worksheets/sheet1.xml'
  const sheetFile = zip.file(sheetPath)
  if (!sheetFile) throw new Error('Mẫu Excel không có dữ liệu trang phiếu thu tiền.')
  const sheetXml = await sheetFile.async('string')
  let filledXml = fillReceiptSheetXml(sheetXml, data)
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
    if (!workbookXml.includes('<x:calcPr')) workbookXml = workbookXml.replace('</x:workbook>', '<x:calcPr fullCalcOnLoad="1" /></x:workbook>')
    zip.file(workbookPath, workbookXml)
  }

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}

export async function downloadReceiptWorkbook(patient: Patient, intake: Intake): Promise<void> {
  const data = buildReceiptExportData(patient, intake)
  const response = await fetch('/templates/phieu-thu-tien-template.xlsx')
  if (!response.ok) throw new Error('Không tải được mẫu phiếu thu tiền.')

  const template = await response.arrayBuffer()
  const buffer = await createReceiptWorkbook(template, data)
  const blob = new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = data.fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
