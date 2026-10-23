import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveReportDto {
  @IsString()
  @IsNotEmpty()
  folder!: string; // e.g. PhieuTiepNhan, PhieuKham, Kho, KeToan, NhanSu

  @IsString()
  @IsNotEmpty()
  fileName!: string; // e.g. phieu-tiep-nhan-PKB20261022-000001.pdf or .xlsx

  @IsString()
  @IsNotEmpty()
  fileBase64!: string; // Base64 encoded file content

  @IsOptional()
  @IsString()
  contentType?: string; // e.g. application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
}
