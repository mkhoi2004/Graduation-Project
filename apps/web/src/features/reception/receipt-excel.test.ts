import { readFile } from 'node:fs/promises'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildReceiptExportData, createReceiptWorkbook, fillReceiptSheetXml } from './receipt-excel'
import type { Intake, Patient } from './reception-data'

const receiptData = {
  receiptCode: 'TNK20261710/0001', patientCode: 'MBN20261710/0001', patientName: 'Nguyễn Văn An',
  dateOfBirth: '21/05/1990', phone: '0901234567', createdAt: '17/10/2026',
  rows: [{ name: 'Trám răng × 2', unitPrice: 300_000, quantity: 2, amount: 600_000 }],
  total: 600_000, fileName: 'phieu-thu-tien.xlsx',
}

describe('receipt Excel export data', () => {
  it('maps patient and selected services into the three receipt columns', () => {
    const patient: Patient = {
      id: 'MBN20261710/0001', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-05-21', gender: 'Nam',
      phone: '0901234567', address: 'Quận 1', note: '', createdAt: '2026-10-17T01:00:00.000Z', updatedAt: '2026-10-17T01:00:00.000Z',
    }
    const intake: Intake = {
      id: 'TNK20261710/0001', patientId: patient.id, symptoms: 'Đau răng', priority: 'Thường',
      services: [{ serviceId: 'cleaning', quantity: 1 }, { serviceId: 'filling', quantity: 2 }],
      roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY', createdAt: '2026-10-17T01:00:00.000Z',
    }
    const result = buildReceiptExportData(patient, intake)
    expect(result.patientName).toBe('Nguyễn Văn An')
    expect(result.dateOfBirth).toBe('21/05/1990')
    expect(result.rows).toEqual([
      { name: 'Cạo vôi + đánh bóng', unitPrice: 400_000, quantity: 1, amount: 400_000 },
      { name: 'Trám răng × 2', unitPrice: 300_000, quantity: 2, amount: 600_000 },
    ])
    expect(result.total).toBe(1_000_000)
    expect(result.fileName).toBe('phieu-thu-tien-TNK20261710-0001.xlsx')
  })

  it('rejects a receipt with no valid selected services', () => {
    const patient = { id: 'MBN1', fullName: 'An', dateOfBirth: '', gender: 'Nam' as const, phone: '', address: '', note: '', createdAt: '', updatedAt: '' }
    const intake = { id: 'TNK1', patientId: patient.id, symptoms: '', priority: 'Thường' as const, services: [{ serviceId: 'missing', quantity: 1 }], roomId: '', doctorId: '', status: 'DRAFT' as const, createdAt: '' }
    expect(() => buildReceiptExportData(patient, intake)).toThrow(/dịch vụ hợp lệ/i)
  })

  it('fills template variables, service rows and Excel formulas in worksheet XML', () => {
    const serviceRefs = Array.from({ length: 20 }, (_, index) => index + 9).flatMap((row) => [`A${row}`, `E${row}`, `G${row}`, `I${row}`])
    const refs = ['G2', 'G3', 'G4', 'A5', 'G5', ...serviceRefs, 'G30']
    const cells = refs.map((ref) => `<x:c r="${ref}" s="1" />`).join('')
    const xml = `<x:worksheet><x:cols><x:col min="9" max="9" hidden="0" /></x:cols><x:sheetData><x:row>${cells}</x:row></x:sheetData></x:worksheet>`
    const result = fillReceiptSheetXml(xml, receiptData)
    expect(result).toContain('<x:c r="G2" s="1" t="str"><x:v>Họ tên: Nguyễn Văn An</x:v></x:c>')
    expect(result).toContain('<x:c r="A9" s="1" t="str"><x:v>Trám răng × 2</x:v></x:c>')
    expect(result).toContain('<x:c r="E9" s="1"><x:v>300000</x:v></x:c>')
    expect(result).toContain('<x:c r="G9" s="1"><x:f>E9*2</x:f><x:v>600000</x:v></x:c>')
    expect(result).toContain('<x:c r="G30" s="1"><x:f>SUM(G9:G28)</x:f><x:v>600000</x:v></x:c>')
    expect(result).toContain('min="9" max="9" hidden="0"')
  })

  it('preserves the delivered logo while producing a valid populated xlsx', async () => {
    const templatePath = process.cwd().replaceAll('\\', '/').endsWith('/apps/web')
      ? 'public/templates/phieu-thu-tien-template.xlsx'
      : 'apps/web/public/templates/phieu-thu-tien-template.xlsx'
    const template = await readFile(templatePath)
    const arrayBuffer = template.buffer.slice(template.byteOffset, template.byteOffset + template.byteLength) as ArrayBuffer
    const exported = await createReceiptWorkbook(arrayBuffer, receiptData)
    const zip = await JSZip.loadAsync(exported)
    const xml = await zip.file('xl/worksheets/sheet1.xml')?.async('string')
    expect(exported.byteLength).toBeGreaterThan(10_000)
    expect(zip.file('xl/media/image.png')).not.toBeNull()
    expect(xml).toContain('Họ tên: Nguyễn Văn An')
    expect(xml).toContain('<x:f>E9*2</x:f>')
  })
})
