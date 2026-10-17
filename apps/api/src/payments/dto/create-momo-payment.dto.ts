import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMomoPaymentDto {
  @ApiProperty({ example: 'TNK20261710/0001' })
  @IsString()
  @IsNotEmpty()
  intakeCode!: string;

  @ApiProperty({ example: 900000, minimum: 1000 })
  @IsInt()
  @Min(1000)
  amount!: number;
}
