import { beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService();
  });

  it('creates target folder if not exists and saves base64 file', async () => {
    const testFolder = 'TestModule';
    const testFileName = `test-report-${Date.now()}.pdf`;
    const dummyContent = 'Hello DentalERP PDF Report';
    const base64 = Buffer.from(dummyContent).toString('base64');

    const result = await service.saveReport({
      folder: testFolder,
      fileName: testFileName,
      fileBase64: base64,
      contentType: 'application/pdf',
    });

    expect(result.success).toBe(true);
    expect(result.folder).toBe('TestModule');
    expect(result.fileName).toBe(testFileName);
    expect(fs.existsSync(result.fullPath)).toBe(true);
    expect(fs.readFileSync(result.fullPath, 'utf-8')).toBe(dummyContent);

    // Clean up test file & test folder
    fs.unlinkSync(result.fullPath);
    const dir = path.dirname(result.fullPath);
    if (fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
    }
  });

  it('lists saved reports', async () => {
    const list = service.listReports();
    expect(list).toBeDefined();
    expect(Array.isArray(list.reports)).toBe(true);
  });
});
