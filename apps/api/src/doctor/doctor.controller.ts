import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedDoctor, DoctorAccessGuard } from './doctor-access.guard.js';
import { DoctorService } from './doctor.service.js';
import {
  CancelExaminationDto,
  UnlockExaminationDto,
  UpdateResultDto,
  UpdateSuppliesDto,
} from './dto/doctor.dto.js';

@ApiTags('Doctor')
@ApiBearerAuth()
@UseGuards(DoctorAccessGuard)
@Controller('doctor')
export class DoctorController {
  constructor(private readonly service: DoctorService) {}

  @Get('rooms')
  @ApiOperation({ summary: 'Lấy danh sách phòng khám đang hoạt động' })
  getRooms() {
    return this.service.getRooms();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Lấy danh sách hàng đợi bệnh nhân trạng thái Tiếp nhận của phòng khám' })
  getWaitingQueue(
    @Req() req: Request & { user?: AuthenticatedDoctor },
  ) {
    const doctorId = req.user?.sub ?? 1;
    return this.service.getWaitingQueue(doctorId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Lấy ca khám đang diễn ra của bác sĩ' })
  getCurrentExamining(@Req() req: Request & { user?: AuthenticatedDoctor }) {
    const doctorId = req.user?.sub ?? 1;
    return this.service.getCurrentExamining(doctorId);
  }

  @Post('call-next')
  @ApiOperation({ summary: 'Gọi STT tiếp theo (Bước 1)' })
  callNextPatient(
    @Req() req: Request & { user?: AuthenticatedDoctor },
  ) {
    const doctorId = req.user?.sub ?? 1;
    return this.service.callNextPatient(doctorId, doctorId);
  }

  @Get('supplies')
  @ApiOperation({ summary: 'Danh mục VTYT mẫu (Bước 2 - Không hiển thị giá)' })
  getSuppliesCatalog() {
    return this.service.getSuppliesCatalog();
  }

  @Get('examinations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết hồ sơ khám bệnh theo ID' })
  getExaminationById(@Param('id', ParseIntPipe) id: number) {
    return this.service.getExaminationById(id);
  }

  @Put('examinations/:id/supplies')
  @ApiOperation({ summary: 'Cập nhật danh sách VTYT sử dụng (Bước 2)' })
  updateSupplies(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSuppliesDto,
  ) {
    return this.service.updateSupplies(id, dto);
  }

  @Put('examinations/:id/result')
  @ApiOperation({ summary: 'Cập nhật kết quả tổng kết, phương pháp, hướng điều trị và hẹn tái khám (Bước 3)' })
  updateResult(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResultDto,
  ) {
    return this.service.updateResult(id, dto);
  }

  @Post('examinations/:id/print')
  @ApiOperation({ summary: 'Ghi nhận lịch sử in phiếu kết quả tổng kết (Bước 3)' })
  recordPrintHistory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthenticatedDoctor },
  ) {
    return this.service.recordPrintHistory(id, req.user?.sub);
  }

  @Post('examinations/:id/complete')
  @ApiOperation({ summary: 'Ghi sổ (Hoàn thành ca khám - Bước 4)' })
  completeExamination(@Param('id', ParseIntPipe) id: number) {
    return this.service.completeExamination(id);
  }

  @Post('examinations/:id/cancel')
  @ApiOperation({ summary: 'Từ chối / Ngừng khám (Khả dụng mọi bước, bắt buộc nhập lý do)' })
  cancelExamination(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelExaminationDto,
  ) {
    return this.service.cancelExamination(id, dto);
  }

  @Post('examinations/:id/absent')
  @ApiOperation({ summary: 'Đánh dấu bệnh nhân vừa gọi Vắng mặt và tự gọi STT kế tiếp' })
  markAbsent(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthenticatedDoctor },
  ) {
    const doctorId = req.user?.sub ?? 1;
    return this.service.markAbsent(id, doctorId, doctorId);
  }

  @Post('examinations/:id/unlock')
  @ApiOperation({ summary: 'Mở khóa hồ sơ ca khám (Admin / Bác sĩ trưởng khoa)' })
  unlockExamination(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnlockExaminationDto,
    @Req() req: Request & { user?: AuthenticatedDoctor },
  ) {
    const actorId = req.user?.sub ?? 1;
    return this.service.unlockExamination(id, dto, actorId);
  }

  @Get('backup/deleted')
  @ApiOperation({ summary: 'Tra cứu các bản ghi đã xóa được sao lưu trong các bảng *Deleted của Bác sĩ' })
  getDeletedBackups() {
    return this.service.getDeletedBackups();
  }
}
