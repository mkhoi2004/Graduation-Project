import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateIntakeDto {
  @ApiProperty({ example: 'MBN20261710/0001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  patientCode!: string;

  @ApiProperty({ example: 'Đau nhức vùng răng cấm bên phải 2 ngày' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  symptoms!: string;

  @ApiPropertyOptional({ example: 'Thường', enum: ['Thường', 'Ưu tiên'], default: 'Thường' })
  @IsOptional()
  @IsString()
  @IsIn(['Thường', 'Ưu tiên'])
  priority?: 'Thường' | 'Ưu tiên';
}

export class ServiceSelectionDto {
  @ApiProperty({ example: 'cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  serviceCode!: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}

export class UpdateIntakeServicesDto {
  @ApiProperty({ example: 'room-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomCode!: string;

  @ApiProperty({ example: 'doctor-minh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  doctorUsername!: string;

  @ApiProperty({ example: 'Thường', enum: ['Thường', 'Ưu tiên'] })
  @IsString()
  @IsIn(['Thường', 'Ưu tiên'])
  priority!: 'Thường' | 'Ưu tiên';

  @ApiPropertyOptional({ example: 'Người cao tuổi cần được theo dõi sát' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  priorityReason?: string;

  @ApiPropertyOptional({ example: 'Bác sĩ hỗ trợ ngoài ca theo điều phối của quản lý' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  roomOverrideReason?: string;

  @ApiProperty({ type: [ServiceSelectionDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Phải chọn ít nhất 1 dịch vụ chỉ định.' })
  @ValidateNested({ each: true })
  @Type(() => ServiceSelectionDto)
  services!: ServiceSelectionDto[];
}
