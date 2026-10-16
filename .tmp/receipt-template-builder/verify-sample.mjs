import fs from 'node:fs/promises'
import { FileBlob, SpreadsheetFile } from 'file:///C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'

const base = 'C:/Users/ADMIN/Documents/GitHub/Graduation-Project/.tmp/receipt-template-builder'
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(`${base}/phieu-thu-tien-sample.xlsx`))
workbook.recalculate()
const table = await workbook.inspect({ kind: 'table', range: 'Phiếu thu tiền!A1:I32', include: 'values,formulas', tableMaxRows: 32, tableMaxCols: 9 })
console.log(table.ndjson)
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 100 }, summary: 'populated receipt error scan' })
console.log(errors.ndjson)
const preview = await workbook.render({ sheetName: 'Phiếu thu tiền', range: 'A1:H32', scale: 1.5, format: 'png' })
await fs.writeFile(`${base}/receipt-sample-preview.png`, new Uint8Array(await preview.arrayBuffer()))
