import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() taxCode?: string;
}

export class CreateSupplyItemDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsIn(['THUONG', 'VO_CAM', 'VAN_PHONG']) group!: 'THUONG' | 'VO_CAM' | 'VAN_PHONG';
  @IsString() @IsNotEmpty() baseUnit!: string;
  @IsOptional() @IsString() conversionUnit?: string;
  @IsOptional() @IsNumber() @Min(1) conversionRate?: number;
  @IsOptional() @IsInt() @Min(0) minimumStock?: number;
  @IsOptional() @IsInt() @Min(1) expiryWarningDays?: number;
}

export class StockLineDto {
  @IsString() @IsNotEmpty() supplyCode!: string;
  @IsNumber() @Min(0.0001) inputQuantity!: number;
  @IsString() @IsNotEmpty() inputUnit!: string;
  @IsOptional() @IsNumber() @Min(0.0001) conversionFactor?: number;
  @IsOptional() @IsNumber() @Min(0.0001) convertedQuantity?: number;
  @IsOptional() @IsString() batchNo?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsNumber() @Min(0) inputUnitPrice?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) vatRate?: number;
  @IsOptional() @IsInt() manualBatchId?: number;
}

export class CreateReceiptDto {
  @IsInt() @Min(1) supplierId!: number;
  @IsOptional() @IsString() reason?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => StockLineDto) lines!: StockLineDto[];
}

export class CreateIssueDto {
  @IsIn(['INTERNAL', 'DISPOSAL', 'PATIENT_USE']) outboundType!: 'INTERNAL' | 'DISPOSAL' | 'PATIENT_USE';
  @IsOptional() @IsString() recipientDepartment?: string;
  @IsOptional() @IsInt() patientId?: number;
  @IsOptional() @IsInt() intakeId?: number;
  @IsOptional() @IsInt() doctorId?: number;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() nonFefoReason?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => StockLineDto) lines!: StockLineDto[];
}

export class UpdateDocumentDto {
  @IsOptional() @IsInt() supplierId?: number;
  @IsOptional() @IsIn(['INTERNAL', 'DISPOSAL', 'PATIENT_USE']) outboundType?: 'INTERNAL' | 'DISPOSAL' | 'PATIENT_USE';
  @IsOptional() @IsString() recipientDepartment?: string;
  @IsOptional() @IsInt() patientId?: number;
  @IsOptional() @IsInt() intakeId?: number;
  @IsOptional() @IsInt() doctorId?: number;
  @IsOptional() @IsInt() roomId?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() nonFefoReason?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => StockLineDto) lines?: StockLineDto[];
}

export class DocumentActionDto {
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() idempotencyKey?: string;
}

export class CancelDocumentDto {
  @IsString() @IsNotEmpty() reason!: string;
}

export class DisposeBatchDto {
  @IsString() @IsNotEmpty() reason!: string;
  @IsOptional() @IsNumber() @Min(0.0001) quantity?: number;
}

export class DeleteSupplyItemDto {
  @IsString() @IsNotEmpty() reason!: string;
}
