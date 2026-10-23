import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SaveReportDto } from './dto/save-report.dto.js';

export function getReportRootDir(): string {
  if (process.env.REPORT_DIR) {
    return path.resolve(process.env.REPORT_DIR);
  }
  let current = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(current, 'Report');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const fallback = path.resolve(process.cwd(), 'Report');
  if (!fs.existsSync(fallback)) {
    fs.mkdirSync(fallback, { recursive: true });
  }
  return fallback;
}

export interface ReportItem {
  folder: string;
  fileName: string;
  fullPath: string;
  relativePath: string;
  url: string;
  size: number;
  createdAt: string;
  fileType: string;
}

@Injectable()
export class ReportsService {
  private readonly rootDir = getReportRootDir();

  getRootDir(): string {
    return this.rootDir;
  }

  async saveReport(dto: SaveReportDto) {
    if (!dto.folder?.trim() || !dto.fileName?.trim()) {
      throw new BadRequestException('Thư mục và tên file không được để trống.');
    }

    // 1. Sanitize folder and filename (prevent path traversal)
    const safeFolder = dto.folder
      .trim()
      .replace(/[\\/.]/g, '')
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1EA0-\u1EF9]/g, '_');

    let safeFileName = dto.fileName
      .trim()
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\.\.+/g, '.');

    if (!safeFileName) {
      safeFileName = `report-${Date.now()}`;
    }

    // 2. Resolve destination folder inside Report directory
    const targetDir = path.join(this.rootDir, safeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 3. Strip data URL header if present and write file from base64
    let cleanBase64 = dto.fileBase64.trim();
    if (cleanBase64.startsWith('data:') && cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1];
    } else if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const filePath = path.join(targetDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const relativePath = path.join('Report', safeFolder, safeFileName).replace(/\\/g, '/');
    const relativeUrl = `/reports/${encodeURIComponent(safeFolder)}/${encodeURIComponent(safeFileName)}`;

    return {
      success: true,
      folder: safeFolder,
      fileName: safeFileName,
      fullPath: filePath,
      relativePath,
      url: relativeUrl,
      size: buffer.length,
      createdAt: new Date().toISOString(),
      message: `Đã lưu phiếu thành công vào: ${filePath}`,
    };
  }

  listReports(targetFolder?: string): { rootDir: string; totalFiles: number; reports: ReportItem[] } {
    if (!fs.existsSync(this.rootDir)) {
      return { rootDir: this.rootDir, totalFiles: 0, reports: [] };
    }

    const items: ReportItem[] = [];
    const entries = fs.readdirSync(this.rootDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderName = entry.name;
        if (targetFolder && targetFolder !== folderName) continue;

        const subDirPath = path.join(this.rootDir, folderName);
        const subFiles = fs.readdirSync(subDirPath, { withFileTypes: true });

        for (const f of subFiles) {
          if (f.isFile()) {
            const filePath = path.join(subDirPath, f.name);
            const stat = fs.statSync(filePath);
            const ext = path.extname(f.name).toLowerCase();
            items.push({
              folder: folderName,
              fileName: f.name,
              fullPath: filePath,
              relativePath: path.join('Report', folderName, f.name).replace(/\\/g, '/'),
              url: `/reports/${encodeURIComponent(folderName)}/${encodeURIComponent(f.name)}`,
              size: stat.size,
              createdAt: stat.birthtime.toISOString(),
              fileType: ext.replace('.', ''),
            });
          }
        }
      }
    }

    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      rootDir: this.rootDir,
      totalFiles: items.length,
      reports: items,
    };
  }

  getReportFilePath(folder: string, fileName: string): string {
    const safeFolder = folder.replace(/[\\/.]/g, '');
    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_').replace(/\.\.+/g, '.');
    const targetPath = path.resolve(this.rootDir, safeFolder, safeFileName);

    // Path traversal check
    if (!targetPath.startsWith(this.rootDir)) {
      throw new BadRequestException('Đường dẫn không hợp lệ.');
    }

    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException(`Không tìm thấy file: ${fileName} trong thư mục ${folder}`);
    }

    return targetPath;
  }
}
