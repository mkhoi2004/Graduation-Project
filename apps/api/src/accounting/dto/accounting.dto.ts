import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConfirmTaxDto {
  @IsOptional() @IsNumber() @Min(0) @Max(100) taxRate?: number;
  @IsOptional() @IsInt() @Min(0) taxAmount?: number;
  @IsOptional() @IsString() reason?: string;
}

export class PayDebtDto {
  @IsInt() @Min(1) amount!: number;
  @IsIn(['CASH', 'TRANSFER', 'CARD']) method!: string;
  @IsOptional() @IsString() transactionCode?: string;
  @IsDateString() effectiveDate!: string;
}

export class CreateSupplierInvoiceDto {
  @IsString() @IsNotEmpty() invoiceNumber!: string;
  @IsString() @IsNotEmpty() series!: string;
  @IsDateString() invoiceDate!: string;
  @IsOptional() @IsInt() supplierId?: number;
  @IsString() @IsNotEmpty() supplierTaxCode!: string;
  @IsOptional() @IsString() buyerName?: string;
  @IsOptional() @IsString() buyerTaxCode?: string;
  @IsOptional() @IsString() buyerAddress?: string;
  @IsInt() @Min(0) goodsAmount!: number;
  @IsInt() @Min(0) taxAmount!: number;
  @IsInt() @Min(0) totalAmount!: number;
  @IsOptional() @IsString() attachmentName?: string;
  @IsOptional() @IsString() attachmentUrl?: string;
  @IsIn(['PENDING', 'VALID', 'INVALID']) documentStatus!: string;
  @IsOptional() @IsString() differenceNote?: string;
  @IsArray() @IsInt({ each: true }) stockDocumentIds!: number[];
}

export class CreateRefundDto {
  @IsInt() originalEntryId!: number;
  @IsInt() @Min(1) amount!: number;
  @IsString() @IsNotEmpty() reason!: string;
}

export class CreateReconciliationDto {
  @IsDateString() businessDate!: string;
  @IsOptional() @IsInt() roomId?: number;
  @IsInt() @Min(0) countedBalance!: number;
  @IsOptional() @IsString() reason?: string;
}

export class LockPeriodDto {
  @Type(() => Number) @IsInt() @Min(2000) year!: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(12) month!: number;
  @IsString() @IsNotEmpty() reason!: string;
}

export class CreateExpenseDto {
  @IsIn(['MATERIAL_PAYMENT', 'ADMIN_EXPENSE', 'SALARY', 'CARD_FEE', 'LABO_PAYMENT']) category!: string;
  @IsInt() @Min(1) amount!: number;
  @IsIn(['CASH', 'TRANSFER', 'CARD']) method!: string;
  @IsOptional() @IsString() transactionCode?: string;
  @IsOptional() @IsInt() supplierId?: number;
  @IsOptional() @IsInt() roomId?: number;
  @IsDateString() effectiveDate!: string;
  @IsString() @IsNotEmpty() reason!: string;
}

export class RejectWarehouseReceiptDto {
  @IsString() @IsNotEmpty() reason!: string;
}

