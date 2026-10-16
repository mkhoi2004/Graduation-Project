import fs from 'node:fs/promises'
import { SpreadsheetFile, Workbook } from 'file:///C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'

const projectRoot = 'C:/Users/ADMIN/Documents/GitHub/Graduation-Project'
const logoPath = 'C:/Users/ADMIN/AppData/Local/Temp/codex-clipboard-a85a20c6-9685-437c-8f5d-d3d298cab9b3.png'
const outputDir = `${projectRoot}/apps/web/public/templates`
const previewDir = `${projectRoot}/.tmp/receipt-template-builder`

const logo = await fs.readFile(logoPath)
const logoDataUrl = `data:image/png;base64,${logo.toString('base64')}`
const workbook = Workbook.create()
const sheet = workbook.worksheets.add('Phiếu thu tiền')
sheet.showGridLines = false
sheet.tabColor = '#5546E8'

sheet.getRange('A1:I35').format.font = { name: 'Arial', size: 10, color: '#1E293B' }
sheet.getRange('A1:I35').format.verticalAlignment = 'center'
sheet.getRange('A1:D35').format.columnWidth = 12
sheet.getRange('E1:F35').format.columnWidth = 13
sheet.getRange('G1:H35').format.columnWidth = 14
sheet.getRange('I1:I35').format.columnWidth = 3

sheet.mergeCells('C2:F2')
sheet.getRange('C2:F2').values = [['Phiếu Thu Tiền']]
sheet.getRange('C2:F2').format = {
  font: { name: 'Arial', size: 16, bold: true, color: '#302A71' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
}
sheet.getRange('A2:I2').format.rowHeight = 32

sheet.mergeCells('G2:I2')
sheet.mergeCells('G3:I3')
sheet.mergeCells('G4:I4')
sheet.getRange('G2').values = [['{{PATIENT_NAME}}']]
sheet.getRange('G3').values = [['{{DATE_OF_BIRTH}}']]
sheet.getRange('G4').values = [['{{PATIENT_CODE}}']]
sheet.getRange('G2:I4').format.font = { name: 'Arial', size: 9, color: '#334155' }
sheet.getRange('G2:I4').format.horizontalAlignment = 'left'

sheet.mergeCells('A5:D5')
sheet.mergeCells('G5:I5')
sheet.getRange('A5').values = [['{{RECEIPT_CODE}}']]
sheet.getRange('G5').values = [['{{CREATED_AT}}']]
sheet.getRange('A5:I5').format.font = { name: 'Arial', size: 9, italic: true, color: '#64748B' }

sheet.images.add({
  dataUrl: logoDataUrl,
  anchor: { from: { row: 1, col: 0, rowOffsetPx: 4, colOffsetPx: 8 }, extent: { widthPx: 58, heightPx: 58 } },
})

sheet.mergeCells('A8:D8')
sheet.mergeCells('E8:F8')
sheet.mergeCells('G8:H8')
sheet.getRange('A8:H8').values = [['Tên dịch vụ', null, null, null, 'Giá dịch vụ', null, 'Thành tiền', null]]
sheet.getRange('A8:H8').format = {
  fill: '#5546E8',
  font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  borders: { preset: 'outside', style: 'thin', color: '#4338CA' },
}
sheet.getRange('A8:I8').format.rowHeight = 26

for (let row = 9; row <= 28; row += 1) {
  sheet.mergeCells(`A${row}:D${row}`)
  sheet.mergeCells(`E${row}:F${row}`)
  sheet.mergeCells(`G${row}:H${row}`)
  sheet.getRange(`A${row}:H${row}`).format = {
    fill: row % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
    borders: {
      bottom: { style: 'thin', color: '#E2E8F0' },
      left: { style: 'thin', color: '#E2E8F0' },
      right: { style: 'thin', color: '#E2E8F0' },
    },
    verticalAlignment: 'center',
  }
  sheet.getRange(`A${row}:D${row}`).format.horizontalAlignment = 'left'
  sheet.getRange(`E${row}:H${row}`).format.horizontalAlignment = 'right'
  sheet.getRange(`E${row}:H${row}`).format.numberFormat = '#,##0 "₫"'
  sheet.getRange(`A${row}:I${row}`).format.rowHeight = 22
}

sheet.getRange('A9').values = [['{{SERVICE_ROWS}}']]
sheet.getRange('E9').values = [['{{UNIT_PRICE}}']]
sheet.getRange('G9').values = [['{{AMOUNT}}']]
sheet.getRange('I9').values = [['{{QUANTITY}}']]

sheet.mergeCells('A30:F30')
sheet.mergeCells('G30:H30')
sheet.getRange('A30').values = [['Tổng cộng']]
sheet.getRange('G30').formulas = [['=SUM(G9:G28)']]
sheet.getRange('A30:H30').format = {
  fill: '#EEF2FF',
  font: { name: 'Arial', size: 11, bold: true, color: '#302A71' },
  borders: { preset: 'outside', style: 'medium', color: '#5546E8' },
  verticalAlignment: 'center',
}
sheet.getRange('A30:F30').format.horizontalAlignment = 'right'
sheet.getRange('G30:H30').format.horizontalAlignment = 'right'
sheet.getRange('G30:H30').format.numberFormat = '#,##0 "₫"'
sheet.getRange('A30:I30').format.rowHeight = 28

sheet.mergeCells('A32:I32')
sheet.getRange('A32').values = [['Cảm ơn quý khách đã sử dụng dịch vụ tại DentalERP.']]
sheet.getRange('A32:I32').format = {
  font: { name: 'Arial', size: 9, italic: true, color: '#64748B' },
  horizontalAlignment: 'center',
}

workbook.recalculate()
const inspection = await workbook.inspect({
  kind: 'table',
  range: 'Phiếu thu tiền!A1:I32',
  include: 'values,formulas',
  tableMaxRows: 32,
  tableMaxCols: 9,
})
console.log(inspection.ndjson)
const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan',
})
console.log(errors.ndjson)

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(previewDir, { recursive: true })
const preview = await workbook.render({ sheetName: 'Phiếu thu tiền', range: 'A1:I32', scale: 1.5, format: 'png' })
await fs.writeFile(`${previewDir}/receipt-template-preview.png`, new Uint8Array(await preview.arrayBuffer()))
const output = await SpreadsheetFile.exportXlsx(workbook)
await output.save(`${outputDir}/phieu-thu-tien-template.xlsx`)
