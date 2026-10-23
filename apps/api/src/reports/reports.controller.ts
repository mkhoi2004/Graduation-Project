import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SaveReportDto } from './dto/save-report.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('save')
  @ApiOperation({ summary: 'Lưu phiếu (PDF / Excel) vào thư mục Report local' })
  async saveReport(@Body() dto: SaveReportDto) {
    return this.reportsService.saveReport(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách các phiếu đã lưu trong thư mục Report' })
  listReports(@Query('folder') folder?: string) {
    return this.reportsService.listReports(folder);
  }

  @Get(':folder/:fileName')
  @ApiOperation({ summary: 'Xem trực tiếp file báo cáo / phiếu bằng URL (PDF/Excel)' })
  getReportFile(
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = this.reportsService.getReportFilePath(folder, fileName);
    return res.sendFile(filePath);
  }

  @Get('download/:folder/:fileName')
  @ApiOperation({ summary: 'Tải về file báo cáo / phiếu bằng URL' })
  downloadReportFile(
    @Param('folder') folder: string,
    @Param('fileName') fileName: string,
    @Res() res: Response,
  ) {
    const filePath = this.reportsService.getReportFilePath(folder, fileName);
    return res.download(filePath, fileName);
  }
}
