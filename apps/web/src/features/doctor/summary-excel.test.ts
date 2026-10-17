import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  buildSummaryExportData,
  createSummaryWorkbook,
  fillSummarySheetXml,
} from './summary-excel';

const mockExamination = {
  id: 1,
  code: 'PKB20261810/0001',
  startedAt: '2026-10-18T08:30:00.000Z',
  patient: {
    code: 'MBN20261810/0001',
    fullName: 'Trần Văn An',
    dateOfBirth: '1992-04-15',
    phone: '0912345678',
  },
  intake: {
    roomName: 'Phòng khám 01',
    services: [
      { name: 'Trám răng thẩm mỹ', quantity: 1, unit: 'Răng' },
      { name: 'Cạo vôi răng', quantity: 1, unit: '2 hàm' },
    ],
  },
  result: {
    summary: 'Răng 46 sâu ngà trung bình, tủy ổn định',
    treatmentMethod: 'Làm sạch xoang sâu, trám composite 3M Z250',
    treatmentOrientation: 'Tái khám sau 6 tháng hoặc khi có ê buốt',
    nextAppointmentDate: '2027-04-18',
  },
};

describe('summary Excel export', () => {
  it('builds summary export data from examination and result', () => {
    const data = buildSummaryExportData(mockExamination, 'BS. Minh');

    expect(data.examinationCode).toBe('PKB20261810/0001');
    expect(data.patientCode).toBe('MBN20261810/0001');
    expect(data.patientName).toBe('Trần Văn An');
    expect(data.dateOfBirth).toBe('15/04/1992');
    expect(data.doctorName).toBe('BS. Minh');
    expect(data.summary).toBe('Răng 46 sâu ngà trung bình, tủy ổn định');
    expect(data.treatmentMethod).toBe('Làm sạch xoang sâu, trám composite 3M Z250');
    expect(data.treatmentOrientation).toBe('Tái khám sau 6 tháng hoặc khi có ê buốt');
    expect(data.nextAppointmentDate).toBe('18/04/2027');
    expect(data.fileName).toBe('phieu-ket-qua-PKB20261810-0001.xlsx');
  });

  it('fills clinical summary fields and replaces title in worksheet XML', () => {
    const data = buildSummaryExportData(mockExamination, 'BS. Minh');
    const serviceRefs = Array.from({ length: 20 }, (_, index) => index + 9).flatMap((row) => [
      `A${row}`,
      `E${row}`,
      `G${row}`,
      `I${row}`,
    ]);
    const refs = ['G2', 'G3', 'G4', 'A5', 'G5', 'A8', 'E8', 'G8', ...serviceRefs, 'A30', 'G30', 'A32'];
    const cells = refs.map((ref) => `<x:c r="${ref}" s="1" />`).join('');
    const xml = `<x:worksheet><sheetData><x:row r="2"><x:c r="C2"><x:v>Phiếu Thu Tiền</x:v></x:c><x:c r="D2"><x:v>Phiếu Thu Tiền</x:v></x:c><x:c r="E2"><x:v>Phiếu Thu Tiền</x:v></x:c><x:c r="F2"><x:v>Phiếu Thu Tiền</x:v></x:c></x:row><x:row>${cells}</x:row></sheetData></x:worksheet>`;

    const result = fillSummarySheetXml(xml, data);

    expect(result).toContain('Kết Quả Khám &amp; Điều Trị');
    expect(result).toContain('Họ tên: Trần Văn An');
    expect(result).toContain('1. TÓM TẮT KẾT QUẢ KHÁM:');
    expect(result).toContain('Răng 46 sâu ngà trung bình, tủy ổn định');
    expect(result).toContain('2. PHƯƠNG PHÁP ĐIỀU TRỊ:');
    expect(result).toContain('Làm sạch xoang sâu, trám composite 3M Z250');
    expect(result).toContain('3. HƯỚNG ĐIỀU TRỊ TIẾP THEO:');
    expect(result).toContain('Tái khám sau 6 tháng hoặc khi có ê buốt');
    expect(result).toContain('Ngày hẹn: 18/04/2027');
    expect(result).toContain('BS. Minh');
  });

  it('generates a valid populated xlsx using the copied template', async () => {
    const templatePath = process.cwd().replaceAll('\\', '/').endsWith('/apps/web')
      ? 'public/templates/phieu-ket-qua-tong-ket-template.xlsx'
      : 'apps/web/public/templates/phieu-ket-qua-tong-ket-template.xlsx';
    const template = await readFile(templatePath);
    const arrayBuffer = template.buffer.slice(
      template.byteOffset,
      template.byteOffset + template.byteLength,
    ) as ArrayBuffer;

    const data = buildSummaryExportData(mockExamination, 'BS. Minh');
    const exported = await createSummaryWorkbook(arrayBuffer, data);

    expect(exported.byteLength).toBeGreaterThan(10_000);
    const zip = await JSZip.loadAsync(exported);
    const xml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');

    expect(xml).toContain('Họ tên: Trần Văn An');
    expect(xml).toContain('Răng 46 sâu ngà trung bình, tủy ổn định');
  });
});
