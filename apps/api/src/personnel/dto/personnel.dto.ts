import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsDateString() dateOfBirth!: string;
  @IsIn(['Nam', 'Nữ', 'Khác']) gender!: string;
  @IsString() @IsNotEmpty() phone!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() citizenId?: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsInt() roomId?: number;
  @IsDateString() joinDate!: string;
  @IsOptional() @IsString() insuranceCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() bankAccountName?: string;
  @IsInt() @Min(0) baseSalary!: number;
  @IsInt() @Min(0) fixedAllowance!: number;
  @IsOptional() @IsInt() userId?: number;
  @IsOptional() @IsString() contractNumber?: string;
  @IsOptional() @IsString() contractType?: string;
  @IsOptional() @IsDateString() contractStartDate?: string;
  @IsOptional() @IsDateString() contractEndDate?: string;
  @IsOptional() @IsString() note?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(['Nam', 'Nữ', 'Khác']) gender?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() citizenId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsString() insuranceCode?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNumber?: string;
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsInt() @Min(0) baseSalary?: number;
  @IsOptional() @IsInt() @Min(0) fixedAllowance?: number;
  @IsOptional() @IsInt() userId?: number;
}

export class TerminateEmployeeDto {
  @IsDateString() terminationDate!: string;
  @IsString() @IsNotEmpty() terminationReason!: string;
}

export class AssignRoleDto {
  @IsInt() roleId!: number;
  @IsOptional() isPrimary?: boolean;
}

export class CreateShiftDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() startTime!: string;
  @IsString() @IsNotEmpty() endTime!: string;
  @IsIn(['REGULAR', 'ON_DUTY', 'SPLIT']) shiftType!: string;
}

export class AssignShiftDto {
  @IsInt() employeeId!: number;
  @IsInt() shiftId!: number;
  @IsDateString() date!: string;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsString() note?: string;
}

export class RecordAttendanceDto {
  @IsInt() employeeId!: number;
  @IsDateString() date!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() checkInTime?: string;
  @IsOptional() @IsString() checkOutTime?: string;
  @IsOptional() @IsInt() @Min(0) lateMinutes?: number;
  @IsOptional() @IsIn(['PAID_LEAVE', 'UNPAID_LEAVE']) leaveType?: string;
  @IsOptional() @IsNumber() @Min(0) overtimeHours?: number;
  @IsOptional() isOnDuty?: boolean;
  @IsOptional() @IsString() note?: string;
}

export class CheckInDto {
  @IsOptional() @IsBoolean() confirmActiveExam?: boolean;
}

export class CheckOutDto {
  @IsOptional() @IsBoolean() confirmActiveExam?: boolean;
}

export class SaveWorkingHoursConfigDto {
  @IsString() @IsNotEmpty() startTime!: string; // HH:mm
  @IsString() @IsNotEmpty() endTime!: string;   // HH:mm
  @IsString() @IsNotEmpty() splitTime!: string; // HH:mm
  @IsDateString() effectiveDate!: string;      // YYYY-MM-DD
  @IsOptional() @IsString() note?: string;
}

export class AdjustAttendanceDto {
  @IsOptional() @IsInt() id?: number;
  @IsInt() employeeId!: number;
  @IsDateString() date!: string;
  @IsOptional() @IsString() checkInTime?: string;
  @IsOptional() @IsString() checkOutTime?: string;
  @IsOptional() @IsIn(['PAID_LEAVE', 'UNPAID_LEAVE']) leaveType?: string;
  @IsString() @IsNotEmpty() reason!: string; // Lý do bắt buộc khi HR điều chỉnh
  @IsOptional() @IsString() note?: string;
}

export class ApproveAttendanceAdjustmentDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() reason?: string;
}

export class LockAttendanceDto {
  @Type(() => Number) @IsInt() @Min(2000) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
}

export class CreatePayrollDto {
  @Type(() => Number) @IsInt() @Min(2000) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsString() @IsNotEmpty() title!: string;
  @Type(() => Number) @IsNumber() @Min(1) @Max(31) standardWorkingDays!: number;
  @IsOptional() @IsString() note?: string;
}

export class UpdatePayrollItemDto {
  @IsOptional() @IsInt() @Min(0) allowanceAmount?: number;
  @IsOptional() @IsInt() @Min(0) otherBonus?: number;
  @IsOptional() @IsInt() @Min(0) overtimePay?: number;
  @IsOptional() @IsInt() @Min(0) insuranceDeduction?: number;
  @IsOptional() @IsInt() @Min(0) advanceDeduction?: number;
  @IsOptional() @IsInt() @Min(0) otherDeduction?: number;
}

export class CancelPayrollDto {
  @IsString() @IsNotEmpty() cancelReason!: string;
}

export class CreateUserAccountDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @IsNotEmpty() fullName!: string;
  @IsOptional() @IsString() password?: string;
  @Type(() => Number) @IsInt() roleId!: number;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
}

export class UpdateUserAccountDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @Type(() => Number) @IsInt() roleId?: number;
  @IsOptional() @Type(() => Number) @IsInt() employeeId?: number;
}

export class ResetUserPasswordDto {
  @IsOptional() @IsString() newPassword?: string;
}

