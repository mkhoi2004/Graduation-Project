import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser, ReceptionAccessGuard } from './reception-access.guard.js';
import { ReceptionService } from './reception.service.js';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto.js';
import { CreateIntakeDto, UpdateIntakeServicesDto } from './dto/intake.dto.js';
import { CancelIntakeDto, IntakeFiltersDto } from './dto/queue-actions.dto.js';

@ApiTags('Reception')
@ApiBearerAuth()
@UseGuards(ReceptionAccessGuard)
@Controller('reception')
export class ReceptionController {
  constructor(private readonly service: ReceptionService) {}

  @Get('master-data')
  @ApiOperation({ summary: 'Lấy dữ liệu danh mục phòng khám, dịch vụ, bác sĩ' })
  getMasterData() {
    return this.service.getMasterData();
  }

  @Get('patients')
  @ApiOperation({ summary: 'Lấy danh sách hồ sơ bệnh nhân' })
  getPatients() {
    return this.service.getPatients();
  }

  @Post('patients')
  @ApiOperation({ summary: 'Tạo mới hồ sơ bệnh nhân' })
  createPatient(@Body() dto: CreatePatientDto) {
    return this.service.upsertPatient(dto);
  }

  @Put('patients/:code')
  @ApiOperation({ summary: 'Cập nhật hồ sơ bệnh nhân' })
  updatePatient(@Param('code') code: string, @Body() dto: UpdatePatientDto) {
    return this.service.upsertPatient(dto, code);
  }

  @Get('intakes')
  @ApiOperation({ summary: 'Lấy danh sách phiếu tiếp nhận khám' })
  getIntakes(@Query() filters: IntakeFiltersDto) {
    return this.service.getIntakes(filters);
  }

  @Post('intakes')
  @ApiOperation({ summary: 'Tạo mới phiếu tiếp nhận khám' })
  createIntake(
    @Body() dto: CreateIntakeDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.createIntake(dto, req.user?.sub);
  }

  @Put('intakes/:code/services')
  @ApiOperation({ summary: 'Chỉ định dịch vụ, phòng khám và bác sĩ' })
  updateIntakeServices(
    @Param('code') code: string,
    @Body() dto: UpdateIntakeServicesDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.updateIntakeServices(code, dto, req.user?.sub);
  }

  @Post('intakes/:code/pay-cash')
  @ApiOperation({ summary: 'Thu tiền mặt cho phiếu tiếp nhận' })
  payCash(
    @Param('code') code: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.payCash(code, req.user?.sub);
  }

  @Post('intakes/:code/transfer')
  @ApiOperation({ summary: 'Bàn giao hồ sơ cho bác sĩ' })
  transferIntake(@Param('code') code: string) {
    return this.service.transferIntake(code);
  }

  @Post('intakes/:code/print')
  @ApiOperation({ summary: 'Ghi nhận lần in và lấy dữ liệu phiếu tiếp nhận có STT' })
  printIntake(
    @Param('code') code: string,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.recordIntakePrint(code, req.user?.sub);
  }

  @Post('intakes/:code/cancel')
  @ApiOperation({ summary: 'Hủy phiếu tiếp nhận còn đang chờ, giữ nguyên STT đã cấp' })
  cancelIntake(
    @Param('code') code: string,
    @Body() dto: CancelIntakeDto,
    @Req() req: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.cancelIntake(code, dto.reason, req.user?.sub);
  }

  @Delete('patients/:code')
  @ApiOperation({ summary: 'Xóa hồ sơ bệnh nhân (tự động sao lưu vào bảng PatientDeleted)' })
  deletePatient(
    @Param('code') code: string,
    @Query('reason') reason?: string,
    @Req() req?: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.deletePatient(code, reason, req?.user?.username);
  }

  @Delete('intakes/:code')
  @ApiOperation({ summary: 'Xóa phiếu tiếp nhận (tự động sao lưu vào bảng IntakeDeleted)' })
  deleteIntake(
    @Param('code') code: string,
    @Query('reason') reason?: string,
    @Req() req?: Request & { user?: AuthenticatedUser },
  ) {
    return this.service.deleteIntake(code, reason, req?.user?.username);
  }

  @Get('backup/deleted')
  @ApiOperation({ summary: 'Tra cứu các bản ghi đã xóa được sao lưu trong các bảng *Deleted' })
  getDeletedBackups() {
    return this.service.getDeletedBackups();
  }
}
