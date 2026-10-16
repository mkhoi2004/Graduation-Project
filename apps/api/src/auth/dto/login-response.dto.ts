import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'doctor' })
  username!: string;

  @ApiProperty({ example: 'Bác sĩ Demo' })
  fullName!: string;

  @ApiProperty({ example: 'DOCTOR' })
  role!: string;

  @ApiProperty({ example: 'Bác sĩ thực hiện' })
  roleName!: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT dùng cho Authorization: Bearer <token>' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 28800, description: 'Thời hạn token, tính bằng giây' })
  expiresIn!: number;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}
