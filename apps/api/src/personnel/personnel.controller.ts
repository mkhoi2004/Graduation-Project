import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedPersonnelUser, PersonnelAccessGuard } from './personnel.guard.js';
import { PersonnelService } from './personnel.service.js';
import {
  AdjustAttendanceDto,
  ApproveAttendanceAdjustmentDto,
  AssignRoleDto,
  AssignShiftDto,
  CancelPayrollDto,
  CheckInDto,
  CheckOutDto,
  CreateEmployeeDto,
  CreatePayrollDto,
  CreateShiftDto,
  CreateUserAccountDto,
  GenerateWeeklyShiftsDto,
  LockAttendanceDto,
  RecordAttendanceDto,
  ResetUserPasswordDto,
  SaveWorkingHoursConfigDto,
  TerminateEmployeeDto,
  UpdateEmployeeDto,
  UpdatePayrollItemDto,
  UpdateUserAccountDto,
} from './dto/personnel.dto.js';

type PersonnelRequest = Request & { user?: AuthenticatedPersonnelUser };

function getActor(req: PersonnelRequest): AuthenticatedPersonnelUser {
  return req.user ?? { sub: 0, username: 'anonymous', role: '' };
}

@ApiTags('Personnel & HR')
@ApiBearerAuth()
@UseGuards(PersonnelAccessGuard)
@Controller(['hr', 'personnel'])
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan nhân sự, ca trực, chấm công và lương' })
  getOverview() {
    return this.service.getOverview();
  }

  // -----------------------------------------------------------
  // EMPLOYEES
  // -----------------------------------------------------------
  @Get('employees')
  @ApiOperation({ summary: 'Danh sách hồ sơ nhân viên (có bộ lọc và ẩn dữ liệu nhạy cảm)' })
  getEmployees(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
    @Query('roomId') roomId?: string,
    @Query('maskSensitive') maskSensitive?: string,
  ) {
    return this.service.getEmployees({
      search,
      department,
      status,
      roomId: roomId ? Number(roomId) : undefined,
      maskSensitive: maskSensitive !== 'false',
    });
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ nhân viên (ghi nhận audit log)' })
  getEmployeeById(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.getEmployeeById(id, getActor(req));
  }

  @Post('employees')
  @ApiOperation({ summary: 'Tạo hồ sơ nhân viên mới (tự sinh mã NV-xxxx, chống trùng)' })
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() req: PersonnelRequest) {
    return this.service.createEmployee(dto, getActor(req));
  }

  @Put('employees/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ nhân viên' })
  updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.updateEmployee(id, dto, getActor(req));
  }

  @Post('employees/:id/terminate')
  @ApiOperation({ summary: 'Nghỉ việc nhân viên (khóa tài khoản, kiểm tra ca khám dở dang)' })
  terminateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TerminateEmployeeDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.terminateEmployee(id, dto, getActor(req));
  }

  // -----------------------------------------------------------
  // ROLES & ACCESS
  // -----------------------------------------------------------
  @Get('roles')
  @ApiOperation({ summary: 'Danh mục vai trò hệ thống và các tổ hợp role bị cấm' })
  getRoles() {
    return this.service.getRoles();
  }

  // -----------------------------------------------------------
  // USER ACCOUNTS MANAGEMENT (HR & ADMIN)
  // -----------------------------------------------------------
  @Get('users')
  @ApiOperation({ summary: 'Danh sách tài khoản người dùng và vai trò (Bác sĩ, Tiếp nhận, Kho, Kế toán...)' })
  getUserAccounts(
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('roleCode') roleCode?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.getUserAccounts({
      search,
      roleId: roleId ? parseInt(roleId, 10) : undefined,
      roleCode,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Post('users')
  @ApiOperation({ summary: 'Cấp tài khoản đăng nhập mới cho nhân viên' })
  createUserAccount(@Body() dto: CreateUserAccountDto, @Req() req: PersonnelRequest) {
    return this.service.createUserAccount(dto, getActor(req));
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Cập nhật tài khoản người dùng' })
  updateUserAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserAccountDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.updateUserAccount(id, dto, getActor(req));
  }

  @Post('users/:id/toggle-active')
  @ApiOperation({ summary: 'Khóa / Mở khóa tài khoản đăng nhập' })
  toggleUserActive(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.toggleUserAccountActive(id, getActor(req));
  }

  @Post('users/:id/reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu cho tài khoản người dùng' })
  resetUserPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetUserPasswordDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.resetUserPassword(id, dto, getActor(req));
  }

  @Get('user-roles')
  @ApiOperation({ summary: 'Danh sách phân quyền vai trò cho người dùng' })
  getUserRoleAssignments() {
    return this.service.getUserRoleAssignments();
  }

  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Gán vai trò cho tài khoản (kiểm tra tổ hợp cấm và duyệt role nhạy cảm)' })
  assignRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AssignRoleDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.assignRoleToUser(userId, dto, getActor(req));
  }

  @Post('user-roles/:id/approve')
  @ApiOperation({ summary: 'Phê duyệt vai trò nhạy cảm (Tách biệt người lập != người duyệt)' })
  approveRoleAssignment(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.approveRoleAssignment(id, getActor(req));
  }

  @Delete('user-roles/:id')
  @ApiOperation({ summary: 'Thu hồi phân quyền vai trò' })
  revokeRoleAssignment(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.revokeRoleAssignment(id, getActor(req));
  }

  // -----------------------------------------------------------
  // SHIFTS & ATTENDANCE
  // -----------------------------------------------------------
  @Get('shifts')
  @ApiOperation({ summary: 'Danh mục các ca làm việc và ca trực' })
  getWorkShifts() {
    return this.service.getWorkShifts();
  }

  @Post('shifts')
  @ApiOperation({ summary: 'Thêm ca làm việc mới' })
  createWorkShift(@Body() dto: CreateShiftDto, @Req() req: PersonnelRequest) {
    return this.service.createWorkShift(dto, getActor(req));
  }

  @Get('shift-assignments')
  @ApiOperation({ summary: 'Lịch phân ca làm việc' })
  getShiftAssignments(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.service.getShiftAssignments({
      startDate,
      endDate,
      employeeId: employeeId ? Number(employeeId) : undefined,
      roomId: roomId ? Number(roomId) : undefined,
    });
  }

  @Post('shift-assignments')
  @ApiOperation({ summary: 'Phân ca làm việc (chống chồng giờ và trùng phòng)' })
  assignShift(@Body() dto: AssignShiftDto, @Req() req: PersonnelRequest) {
    return this.service.assignShift(dto, getActor(req));
  }

  @Post('shift-assignments/generate-weekly')
  @ApiOperation({ summary: 'Tự động xếp lịch làm việc Thứ 2 đến Thứ 7 theo giờ chuẩn từ HR' })
  generateWeeklyShifts(@Body() dto: GenerateWeeklyShiftsDto, @Req() req: PersonnelRequest) {
    return this.service.generateWeeklyShifts(dto, getActor(req));
  }

  // -----------------------------------------------------------
  // WORKING HOURS CONFIGURATION
  // -----------------------------------------------------------
  @Get('working-hours')
  @ApiOperation({ summary: 'Lấy cấu hình thời gian làm việc có hiệu lực' })
  getWorkingHoursConfig(@Query('date') date?: string) {
    return this.service.getWorkingHoursConfig(date);
  }

  @Get('working-hours/history')
  @ApiOperation({ summary: 'Lịch sử thay đổi cấu hình thời gian làm việc' })
  getWorkingHoursHistory() {
    return this.service.getWorkingHoursHistory();
  }

  @Post('working-hours')
  @ApiOperation({ summary: 'Lưu cấu hình thời gian làm việc mới (có ngày hiệu lực & kiểm tra thứ tự)' })
  saveWorkingHoursConfig(@Body() dto: SaveWorkingHoursConfigDto, @Req() req: PersonnelRequest) {
    return this.service.saveWorkingHoursConfig(dto, getActor(req));
  }

  // -----------------------------------------------------------
  // UNIVERSAL CHECK-IN & CHECK-OUT (MỌI MÀN HÌNH / MỌI ROLE)
  // -------------------------------------------------------------
  @Get('attendance/status')
  @ApiOperation({ summary: 'Lấy trạng thái Check-in / Check-out hôm nay của người dùng đăng nhập' })
  getTodayAttendanceStatus(@Req() req: PersonnelRequest) {
    return this.service.getTodayAttendanceStatus(getActor(req));
  }

  @Post('attendance/check-in')
  @ApiOperation({ summary: 'Thực hiện Check-in cho chính mình (lấy giờ máy chủ Asia/Ho_Chi_Minh)' })
  checkIn(@Body() dto: CheckInDto, @Req() req: PersonnelRequest) {
    return this.service.checkIn(dto, getActor(req));
  }

  @Post('attendance/check-out')
  @ApiOperation({ summary: 'Thực hiện Check-out cho chính mình (cảnh báo nếu bác sĩ đang có ca khám)' })
  checkOut(@Body() dto: CheckOutDto, @Req() req: PersonnelRequest) {
    return this.service.checkOut(dto, getActor(req));
  }

  @Get('attendance/summary')
  @ApiOperation({ summary: 'Báo cáo tổng hợp chấm công tháng (tổng công lẻ 0.5, đi trễ, tăng ca, thiếu check-out)' })
  getMonthlyAttendanceSummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const y = year ? parseInt(year, 10) : 2026;
    const m = month ? parseInt(month, 10) : 10;
    return this.service.getMonthlyAttendanceSummary(y, m);
  }

  @Post('attendance/adjust')
  @ApiOperation({ summary: 'HR bổ sung hoặc sửa giờ chấm công (lý do bắt buộc, bảo lưu giờ gốc, chờ duyệt)' })
  adjustAttendance(@Body() dto: AdjustAttendanceDto, @Req() req: PersonnelRequest) {
    return this.service.adjustAttendance(dto, getActor(req));
  }

  @Post('attendance/:id/approve')
  @ApiOperation({ summary: 'Quản lý duyệt điều chỉnh chấm công (Quy tắc người sửa != người duyệt)' })
  approveAttendanceAdjustment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveAttendanceAdjustmentDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.approveAttendanceAdjustment(id, dto, getActor(req));
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Bảng chấm công hàng ngày' })
  getAttendance(
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('roomId') roomId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getAttendanceRecords({
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
      employeeId: employeeId ? Number(employeeId) : undefined,
      status,
      roomId: roomId ? Number(roomId) : undefined,
      startDate,
      endDate,
    });
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Ghi nhận chấm công (ghi nhận đi trễ, không tự phạt tiền)' })
  recordAttendance(@Body() dto: RecordAttendanceDto, @Req() req: PersonnelRequest) {
    return this.service.recordAttendance(dto, getActor(req));
  }

  @Post('attendance/lock')
  @ApiOperation({ summary: 'Khóa công kỳ tháng' })
  lockAttendance(@Body() dto: LockAttendanceDto, @Req() req: PersonnelRequest) {
    return this.service.lockAttendance(dto.year, dto.month, getActor(req));
  }

  // -----------------------------------------------------------
  // SERVICE INCENTIVES
  // -----------------------------------------------------------
  @Get('incentives')
  @ApiOperation({ summary: 'Thưởng theo dòng dịch vụ (5% bác sĩ + 5% tiếp nhận)' })
  getServiceIncentives(
    @Query('employeeId') employeeId?: string,
    @Query('roleType') roleType?: string,
    @Query('status') status?: string,
  ) {
    return this.service.getServiceIncentives({
      employeeId: employeeId ? Number(employeeId) : undefined,
      roleType,
      status,
    });
  }

  @Post('incentives/sync')
  @ApiOperation({ summary: 'Đồng bộ tính thưởng từ các ca khám đã hoàn thành' })
  syncIncentives(@Req() req: PersonnelRequest) {
    return this.service.syncIncentivesFromCompletedExaminations(getActor(req));
  }

  // -----------------------------------------------------------
  // PAYROLL
  // -----------------------------------------------------------
  @Get('payrolls')
  @ApiOperation({ summary: 'Danh sách các kỳ bảng lương' })
  getPayrolls() {
    return this.service.getPayrolls();
  }

  @Get('payrolls/:id')
  @ApiOperation({ summary: 'Xem chi tiết bảng lương và danh sách nhân viên' })
  getPayrollById(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.getPayrollById(id, getActor(req));
  }

  @Post('payrolls')
  @ApiOperation({ summary: 'Lập bảng lương mới (DRAFT) từ số công chuẩn và thưởng dịch vụ' })
  createPayroll(@Body() dto: CreatePayrollDto, @Req() req: PersonnelRequest) {
    return this.service.createPayroll(dto, getActor(req));
  }

  @Put('payrolls/:id/items/:itemId')
  @ApiOperation({ summary: 'Điều chỉnh phụ cấp / khấu trừ trên dòng lương nhân viên' })
  updatePayrollItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdatePayrollItemDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.updatePayrollItem(id, itemId, dto, getActor(req));
  }

  @Post('payrolls/:id/approve')
  @ApiOperation({ summary: 'Phê duyệt bảng lương (Quản lý duyệt, khác người lập)' })
  approvePayroll(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.approvePayroll(id, getActor(req));
  }

  @Post('payrolls/:id/lock')
  @ApiOperation({ summary: 'Chốt khóa bảng lương và tự động ghi nợ phải trả sang Kế toán' })
  lockPayroll(@Param('id', ParseIntPipe) id: number, @Req() req: PersonnelRequest) {
    return this.service.lockPayroll(id, getActor(req));
  }

  @Post('payrolls/:id/cancel')
  @ApiOperation({ summary: 'Hủy bảng lương chưa thanh toán' })
  cancelPayroll(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPayrollDto,
    @Req() req: PersonnelRequest,
  ) {
    return this.service.cancelPayroll(id, dto, getActor(req));
  }

  // -----------------------------------------------------------
  // AUDIT LOGS
  // -----------------------------------------------------------
  @Get('audit-logs')
  @ApiOperation({ summary: 'Nhật ký kiểm toán nhân sự và tiền lương' })
  getAuditLogs() {
    return this.service.getAuditLogs();
  }

  // -----------------------------------------------------------
  // SELF-SERVICE
  // -----------------------------------------------------------
  @Get('me/profile')
  @ApiOperation({ summary: 'Xem hồ sơ cá nhân của người dùng đang đăng nhập' })
  getMyProfile(@Req() req: PersonnelRequest) {
    return this.service.getMyProfile(getActor(req));
  }

  @Get('me/payslips')
  @ApiOperation({ summary: 'Xem các phiếu lương của chính mình' })
  getMyPayslips(@Req() req: PersonnelRequest) {
    return this.service.getMyPayslips(getActor(req));
  }
}
