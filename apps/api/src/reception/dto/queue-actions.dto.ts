import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class IntakeFiltersDto {
  @ApiPropertyOptional({ example: '2026-10-21', description: 'Ngày phòng khám, định dạng yyyy-MM-dd' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ example: 'room-01' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomCode?: string;

  @ApiPropertyOptional({ enum: ['Thường', 'Ưu tiên'] })
  @IsOptional()
  @IsIn(['Thường', 'Ưu tiên'])
  priority?: 'Thường' | 'Ưu tiên';
}

export class CancelIntakeDto {
  @ApiProperty({ example: 'Thay đổi dịch vụ theo yêu cầu của bệnh nhân' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
