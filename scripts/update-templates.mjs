import fs from 'node:fs';
import JSZip from 'jszip';

async function updateTemplate(filename) {
  const filePath = `apps/web/public/templates/${filename}`;
  const distPath = `apps/web/dist/templates/${filename}`;
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);

  // 1. Replace image.png with new Logo.png
  const newLogo = fs.readFileSync('apps/web/public/Logo.png');
  zip.file('xl/media/image.png', newLogo);

  // 2. Adjust drawing1.xml aspect ratio if exists
  const drawingFile = zip.file('xl/drawings/drawing1.xml');
  if (drawingFile) {
    let drawingXml = await drawingFile.async('string');
    // Original was cx="552450" cy="552450" (1:1)
    // Logo.png is 1387x949 (ratio ~1.4615)
    // Keep cy = 552450, cx = 807424
    drawingXml = drawingXml.replace(/cx="\d+"\s+cy="\d+"/, 'cx="807424" cy="552450"');
    zip.file('xl/drawings/drawing1.xml', drawingXml);
  }

  // 3. Replace DentalERP with DentalKhoi across all xml files in the archive
  for (const name of Object.keys(zip.files)) {
    if (name.endsWith('.xml') || name.endsWith('.rels')) {
      let content = await zip.file(name).async('string');
      if (content.includes('DentalERP') || content.includes('DentalCare') || content.includes('KhoiDent')) {
        content = content
          .replace(/DentalERP/g, 'DentalKhoi')
          .replace(/DentalCare/g, 'DentalKhoi')
          .replace(/KhoiDent/g, 'DentalKhoi');
        zip.file(name, content);
      }
    }
  }

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(filePath, outBuf);
  if (fs.existsSync('apps/web/dist/templates')) {
    fs.writeFileSync(distPath, outBuf);
  }
  console.log(`Successfully updated ${filename} (${outBuf.length} bytes)`);
}

async function main() {
  await updateTemplate('phieu-thu-tien-template.xlsx');
  await updateTemplate('phieu-ket-qua-tong-ket-template.xlsx');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
