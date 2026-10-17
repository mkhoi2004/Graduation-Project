import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CallNextPatientDto {
  @ApiProperty({ example: 'room-01', description: 'Mã phòng khám bác sĩ đang trực' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomCode!: string;
}

export class SupplyUsageItemDto {
  @ApiProperty({ example: 'needle-septoject' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  supplyCode!: string;

  @ApiPropertyOptional({ example: 'Hộp', description: 'Đơn vị quy đổi đã chọn (nếu có)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  conversionUnitUsed?: string;

  @ApiProperty({ example: 2, description: 'Số lượng theo đơn vị cơ bản (CHECK > 0)' })
  @IsInt()
  @Min(1, { message: 'Số lượng vật tư phải lớn hơn 0' })
  @Max(10000, { message: 'Số lượng vật tư không hợp lệ' })
  quantityInBaseUnit!: number;
}

export class UpdateSuppliesDto {
  @ApiProperty({ type: [SupplyUsageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplyUsageItemDto)
  supplies!: SupplyUsageItemDto[];
}

export class UpdateResultDto {
  @ApiProperty({ example: 'Răng 46 sâu ngà sâu, tủy còn sống; nướu hơi viêm' })
  @IsString()
  @IsNotEmpty({ message: 'Tóm tắt kết quả không được để trống' })
  @MaxLength(2000)
  summary!: string;

  @ApiProperty({ example: 'Làm sạch xoang sâu, trám composite quang trùng hợp' })
  @IsString()
  @IsNotEmpty({ message: 'Phương pháp điều trị không được để trống' })
  @MaxLength(2000)
  treatmentMethod!: string;

  @ApiProperty({ example: 'Vệ sinh răng miệng đúng cách, tránh nhai đồ cứng 24h đầu' })
  @IsString()
  @IsNotEmpty({ message: 'Hướng điều trị không được để trống' })
  @MaxLength(2000)
  treatmentOrientation!: string;

  @ApiPropertyOptional({ example: '2026-10-25' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày hẹn phải có định dạng YYYY-MM-DD' })
  nextAppointmentDate?: string;
}

export class CancelExaminationDto {
  @ApiProperty({ example: 'Bệnh nhân bỏ về, huyết áp cao chống chỉ định nhổ răng' })
  @IsString()
  @IsNotEmpty({ message: 'Bắt buộc nhập lý do ngừng khám / từ chối' })
  @MaxLength(500)
  reason!: string;
}

export class UnlockExaminationDto {
  @ApiProperty({ example: 'Bác sĩ trưởng khoa yêu cầu bổ sung thông tin tóm tắt điều trị' })
  @IsString()
  @IsNotEmpty({ message: 'Bắt buộc nhập lý do mở khóa hồ sơ' })
  @MaxLength(500)
  reason!: string;
}
