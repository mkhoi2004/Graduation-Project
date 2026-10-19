import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AccountingAccessGuard, type AuthenticatedAccountingUser } from './accounting.guard.js';
import { AccountingService } from './accounting.service.js';
import {
  ConfirmTaxDto,
  CreateExpenseDto,
  CreateReconciliationDto,
  CreateRefundDto,
  CreateSupplierInvoiceDto,
  LockPeriodDto,
  PayDebtDto,
} from './dto/accounting.dto.js';

type AccountingRequest = Request & { user?: AuthenticatedAccountingUser };

function startDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function endDate(value?: string) {
  return value ? new Date(`${value}T23:59:59.999Z`) : undefined;
}

function actor(req: AccountingRequest) {
  return { id: req.user?.sub ?? 0, role: req.user?.role ?? '' };
}

@ApiTags('Accounting')
@ApiBearerAuth()
@UseGuards(AccountingAccessGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Tổng quan dòng tiền, hiệu quả và công nợ tách biệt' })
  overview(
    @Query('startDate') from?: string,
    @Query('endDate') to?: string,
    @Query('roomId') roomId?: string,
    @Query('serviceType') serviceType?: string,
    @Query('supplyType') supplyType?: string,
  ) {
    return this.service.getOverview({
      startDate: startDate(from), endDate: endDate(to), roomId: roomId ? Number(roomId) : undefined,
      serviceType, supplyType,
    });
  }

  @Get('cash')
  @ApiOperation({ summary: 'Sổ quỹ thu chi tiền mặt và ngân hàng (lọc theo kỳ, quầy, danh mục)' })
  cash(@Query('startDate') from?: string, @Query('endDate') to?: string, @Query('roomId') roomId?: string, @Query('category') category?: string, @Query('paymentMethod') paymentMethod?: string) {
    return this.service.getCash({ startDate: startDate(from), endDate: endDate(to), roomId: roomId ? Number(roomId) : undefined, category, paymentMethod });
  }

  @Get('losses')
  @ApiOperation({ summary: 'Báo cáo chi phí và hao hụt phòng khám (hủy vật tư, thất thoát)' })
  losses(@Query('startDate') from?: string, @Query('endDate') to?: string, @Query('roomId') roomId?: string) {
    return this.service.getLosses({ startDate: startDate(from), endDate: endDate(to), roomId: roomId ? Number(roomId) : undefined });
  }

  @Get('debts')
  @ApiOperation({ summary: 'Sổ theo dõi công nợ phải thu bệnh nhân và phải trả nhà cung cấp/nhân viên' })
  debts(@Query('type') debtType?: string) { return this.service.getDebts({ debtType }); }

  @Get('supplier-invoices')
  @ApiOperation({ summary: 'Danh sách hóa đơn đầu vào từ nhà cung cấp' })
  getSupplierInvoices() {
    return this.service.getSupplierInvoices();
  }

  @Get('pending-stock-documents')
  @ApiOperation({ summary: 'Danh sách phiếu nhập kho chờ gắn hóa đơn tài chính' })
  getPendingStockDocuments() {
    return this.service.getPendingInvoiceStockDocuments();
  }

  @Get('reconciliations')
  @ApiOperation({ summary: 'Danh sách biên bản kiểm kê và đối soát quỹ tiền mặt' })
  getReconciliations() {
    return this.service.getReconciliations();
  }

  @Get('period-locks')
  @ApiOperation({ summary: 'Lịch sử và danh sách các kỳ kế toán đã khóa sổ' })
  getPeriodLocks() {
    return this.service.getPeriodLocks();
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Danh sách yêu cầu hoàn tiền dịch vụ cho bệnh nhân' })
  getRefunds() {
    return this.service.getRefunds();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Nhật ký kiểm toán kế toán và thay đổi số liệu tài chính' })
  getAuditLogs() {
    return this.service.getAuditLogs();
  }

  @Get('performance-details')
  @ApiOperation({ summary: 'Chi tiết báo cáo hiệu quả chuyên môn và giá vốn vật tư' })
  getPerformanceDetails(
    @Query('startDate') from?: string,
    @Query('endDate') to?: string,
    @Query('roomId') roomId?: string,
  ) {
    return this.service.getPerformanceDetails({
      startDate: startDate(from),
      endDate: endDate(to),
      roomId: roomId ? Number(roomId) : undefined,
    });
  }

  @Put('entries/:id/tax')
  @ApiOperation({ summary: 'Xác nhận trạng thái thuế và hóa đơn VAT cho khoản thu chi' })
  confirmTax(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmTaxDto, @Req() req: AccountingRequest) {
    return this.service.confirmTax(id, dto, actor(req));
  }

  @Post('debts/:id/payments')
  @ApiOperation({ summary: 'Ghi nhận thanh toán công nợ phải thu hoặc chi trả công nợ phải trả' })
  payDebt(@Param('id', ParseIntPipe) id: number, @Body() dto: PayDebtDto, @Req() req: AccountingRequest) {
    return this.service.createDebtPayment(id, {
      amount: dto.amount,
      method: dto.method,
      transactionCode: dto.transactionCode,
      effectiveDate: startDate(dto.effectiveDate)!,
    }, actor(req));
  }

  @Post('supplier-invoices')
  @ApiOperation({ summary: 'Tạo và khớp hóa đơn nhà cung cấp với phiếu nhập kho' })
  createInvoice(@Body() dto: CreateSupplierInvoiceDto, @Req() req: AccountingRequest) {
    return this.service.createSupplierInvoice({
      invoiceNumber: dto.invoiceNumber,
      series: dto.series,
      supplierId: dto.supplierId,
      supplierTaxCode: dto.supplierTaxCode,
      buyerName: dto.buyerName,
      buyerTaxCode: dto.buyerTaxCode,
      buyerAddress: dto.buyerAddress,
      goodsAmount: dto.goodsAmount,
      taxAmount: dto.taxAmount,
      totalAmount: dto.totalAmount,
      attachmentName: dto.attachmentName,
      attachmentUrl: dto.attachmentUrl,
      documentStatus: dto.documentStatus,
      differenceNote: dto.differenceNote,
      stockDocumentIds: dto.stockDocumentIds,
      invoiceDate: startDate(dto.invoiceDate)!,
    }, actor(req));
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Lập phiếu chi chi phí vận hành phòng khám (điện, nước, thuê nhà...)' })
  createExpense(@Body() dto: CreateExpenseDto, @Req() req: AccountingRequest) {
    return this.service.createExpense({
      category: dto.category,
      amount: dto.amount,
      method: dto.method,
      transactionCode: dto.transactionCode,
      supplierId: dto.supplierId,
      roomId: dto.roomId,
      reason: dto.reason,
      effectiveDate: startDate(dto.effectiveDate)!,
    }, actor(req));
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Tạo yêu cầu hoàn tiền dịch vụ chưa thực hiện hoặc hủy ca' })
  createRefund(@Body() dto: CreateRefundDto, @Req() req: AccountingRequest) {
    return this.service.createRefundRequest(dto, actor(req));
  }

  @Post('refunds/:id/approve')
  @ApiOperation({ summary: 'Phê duyệt hoàn tiền dịch vụ (Tách biệt Người duyệt != Người lập)' })
  approveRefund(@Param('id', ParseIntPipe) id: number, @Req() req: AccountingRequest) {
    return this.service.approveRefund(id, actor(req));
  }

  @Post('reconciliations')
  @ApiOperation({ summary: 'Lập biên bản kiểm kê quỹ tiền mặt cuối ngày' })
  createReconciliation(@Body() dto: CreateReconciliationDto, @Req() req: AccountingRequest) {
    return this.service.createReconciliation({
      countedBalance: dto.countedBalance,
      roomId: dto.roomId,
      reason: dto.reason,
      businessDate: startDate(dto.businessDate)!,
    }, actor(req));
  }

  @Post('reconciliations/:id/confirm')
  @ApiOperation({ summary: 'Xác nhận xử lý chênh lệch quỹ tiền mặt (ghi nhận thừa/thiếu)' })
  confirmReconciliation(@Param('id', ParseIntPipe) id: number, @Req() req: AccountingRequest) {
    return this.service.confirmReconciliation(id, actor(req));
  }

  @Post('period-locks')
  @ApiOperation({ summary: 'Khóa sổ kỳ kế toán tháng (ngăn chặn mọi điều chỉnh hồi tố)' })
  lockPeriod(@Body() dto: LockPeriodDto, @Req() req: AccountingRequest) {
    return this.service.lockPeriod(dto, actor(req));
  }
}
