import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: '1992-05-14' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày sinh phải có định dạng YYYY-MM-DD' })
  dateOfBirth!: string;

  @ApiProperty({ example: 'Nam', enum: ['Nam', 'Nữ', 'Khác'] })
  @IsString()
  @IsIn(['Nam', 'Nữ', 'Khác'])
  gender!: 'Nam' | 'Nữ' | 'Khác';

  @ApiProperty({ example: '0912345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({ example: '001092012345', description: 'Số CCCD 12 chữ số theo quy định pháp luật' })
  @IsString()
  @IsNotEmpty({ message: 'Số CCCD là bắt buộc trong hồ sơ khi khám.' })
  @Matches(/^\d{12}$/, { message: 'CCCD phải có đúng 12 chữ số' })
  citizenId!: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Trãi, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Dị ứng nhẹ với penicillin' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: 'MBN20261022/0001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: '1992-05-14' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày sinh phải có định dạng YYYY-MM-DD' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Nam', enum: ['Nam', 'Nữ', 'Khác'] })
  @IsOptional()
  @IsString()
  @IsIn(['Nam', 'Nữ', 'Khác'])
  gender?: 'Nam' | 'Nữ' | 'Khác';

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '001092012345', description: 'Số CCCD 12 chữ số theo quy định pháp luật' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'CCCD phải có đúng 12 chữ số' })
  citizenId?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Trãi, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Dị ứng nhẹ với penicillin' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: 'MBN20261022/0001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
