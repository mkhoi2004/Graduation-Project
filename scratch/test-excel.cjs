const fs = require('fs');
const JSZip = require('jszip');

function formatVietnameseDate(value) {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceCell(xml, reference, body, type) {
  const pattern = new RegExp(`<x:c r="${reference}"([^>]*?)(?:\\s*/>|>[\\s\\S]*?<\\/x:c>)`);
  const match = pattern.exec(xml);
  if (!match) throw new Error(`Mẫu Excel thiếu ô ${reference}.`);
  const style = /\s+s="([^"]+)"/.exec(match[1])?.[1];
  const attributes = `${style ? ` s="${style}"` : ''}${type ? ` t="${type}"` : ''}`;
  return xml.replace(pattern, `<x:c r="${reference}"${attributes}>${body}</x:c>`);
}

function stringCell(xml, reference, value) {
  return replaceCell(xml, reference, `<x:v>${escapeXml(value)}</x:v>`, 'str');
}

function clearCell(xml, reference) {
  return replaceCell(xml, reference, '');
}

function fillSummarySheetXml(sourceXml, data) {
  let xml = sourceXml;

  // Title: replace C2, D2, E2, F2 cleanly using stringCell without duplicate t="str"
  const title = 'Kết Quả Khám & Điều Trị';
  xml = stringCell(xml, 'C2', title);
  xml = stringCell(xml, 'D2', title);
  xml = stringCell(xml, 'E2', title);
  xml = stringCell(xml, 'F2', title);

  xml = stringCell(xml, 'G2', `Họ tên: ${data.patientName}`);
  xml = stringCell(xml, 'G3', `Ngày sinh: ${data.dateOfBirth || 'Chưa cập nhật'}`);
  xml = stringCell(xml, 'G4', `Mã bệnh nhân: ${data.patientCode}`);
  xml = stringCell(xml, 'A5', `Mã phiếu: ${data.examinationCode}`);
  xml = stringCell(xml, 'G5', `Ngày lập: ${data.createdAt}`);

  xml = stringCell(xml, 'A8', 'Nội dung điều trị & Kết luận chuyên môn');
  xml = stringCell(xml, 'E8', 'Chi tiết / Ghi chú');
  xml = stringCell(xml, 'G8', 'Trạng thái');

  const firstServiceRow = 9;
  const lastServiceRow = 28;

  for (let rowNumber = firstServiceRow; rowNumber <= lastServiceRow; rowNumber += 1) {
    xml = clearCell(xml, `A${rowNumber}`);
    xml = clearCell(xml, `E${rowNumber}`);
    xml = clearCell(xml, `G${rowNumber}`);
    xml = clearCell(xml, `I${rowNumber}`);
  }

  let currentRow = firstServiceRow;

  if (data.services.length > 0) {
    xml = stringCell(xml, `A${currentRow}`, '★ CÁC DỊCH VỤ THỰC HIỆN:');
    currentRow += 1;
    for (const service of data.services) {
      if (currentRow <= lastServiceRow) {
        xml = stringCell(xml, `A${currentRow}`, `  • ${service.name} (SL: ${service.quantity} ${service.unit ?? ''})`.trim());
        xml = stringCell(xml, `G${currentRow}`, 'Đã thực hiện');
        currentRow += 1;
      }
    }
  }

  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '1. TÓM TẮT KẾT QUẢ KHÁM:');
    xml = stringCell(xml, `E${currentRow}`, data.summary);
    currentRow += 1;
  }

  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '2. PHƯƠNG PHÁP ĐIỀU TRỊ:');
    xml = stringCell(xml, `E${currentRow}`, data.treatmentMethod);
    currentRow += 1;
  }

  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '3. HƯỚNG ĐIỀU TRỊ TIẾP THEO:');
    xml = stringCell(xml, `E${currentRow}`, data.treatmentOrientation);
    currentRow += 1;
  }

  if (currentRow <= lastServiceRow) {
    xml = stringCell(xml, `A${currentRow}`, '4. HẸN TÁI KHÁM:');
    xml = stringCell(xml, `E${currentRow}`, data.nextAppointmentDate ? `Ngày hẹn: ${data.nextAppointmentDate}` : 'Không hẹn tái khám');
    currentRow += 1;
  }

  xml = stringCell(xml, 'A30', `Bác sĩ khám: ${data.doctorName ?? 'Bác sĩ điều trị'}`);
  xml = clearCell(xml, 'G30');
  xml = stringCell(xml, 'A32', 'Chúc quý khách hồi phục nhanh chóng & nụ cười luôn tự tin!');

  return xml;
}

async function test() {
  const templateBuf = fs.readFileSync('apps/web/public/templates/phieu-ket-qua-tong-ket-template.xlsx');
  const zip = await JSZip.loadAsync(templateBuf);
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const sheetXml = await zip.file(sheetPath).async('string');

  const sampleData = {
    examinationCode: 'PKB20261810/0011',
    patientCode: 'BN20261810/0010',
    patientName: 'Bệnh Nhân E2E Test',
    dateOfBirth: '10/12/1995',
    phone: '0991803659',
    createdAt: '18/10/2026',
    services: [{ name: 'Cạo vôi + đánh bóng', quantity: 2, unit: '2 hàm' }],
    summary: 'Răng 46 sâu ngà sâu, viêm lợi cục bộ',
    treatmentMethod: 'Làm sạch cao răng, trám lót men',
    treatmentOrientation: 'Tránh ăn nóng lạnh trong 24h',
    nextAppointmentDate: '25/10/2026',
    doctorName: 'BS. Bác sĩ Demo',
    roomName: 'Phòng khám 01',
    fileName: 'phieu-ket-qua-test.xlsx',
  };

  const newSheetXml = fillSummarySheetXml(sheetXml, sampleData);

  // Check for any duplicate attributes in XML
  const dupAttrRegex = /<[^>]+\s+([a-zA-Z_:][-a-zA-Z0-9_:.]*)=[^>]+\s+\1=/g;
  let dupMatch;
  let hasDup = false;
  while ((dupMatch = dupAttrRegex.exec(newSheetXml)) !== null) {
    console.error('DUPLICATE ATTRIBUTE FOUND:', dupMatch[0]);
    hasDup = true;
  }
  if (!hasDup) {
    console.log('NO duplicate attributes in sheet1.xml! Clean XML!');
  }

  zip.file(sheetPath, newSheetXml);

  const workbookPath = 'xl/workbook.xml';
  const workbookFile = zip.file(workbookPath);
  if (workbookFile) {
    let workbookXml = await workbookFile.async('string');
    // Rename sheet to "Phiếu kết quả"
    workbookXml = workbookXml.replace('name="Phiếu thu tiền"', 'name="Phiếu kết quả"');
    if (!workbookXml.includes('<x:calcPr')) {
      workbookXml = workbookXml.replace('</x:workbook>', '<x:calcPr fullCalcOnLoad="1" /></x:workbook>');
    }
    zip.file(workbookPath, workbookXml);
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('scratch/phieu-ket-qua-fixed.xlsx', outBuf);
  console.log('Wrote scratch/phieu-ket-qua-fixed.xlsx successfully!');
}

test().catch(console.error);
