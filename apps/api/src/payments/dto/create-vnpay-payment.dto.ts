import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateVnpayPaymentDto {
  @ApiProperty({ example: 'TNK20261710/0001' })
  @IsString()
  @IsNotEmpty()
  intakeCode!: string;

  @ApiProperty({ example: 900000, minimum: 1000 })
  @IsInt()
  @Min(1000)
  amount!: number;

  @ApiProperty({ required: false, example: 'NCB' })
  @IsString()
  @IsOptional()
  bankCode?: string;
}
