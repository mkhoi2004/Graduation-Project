import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  CancelDocumentDto,
  CreateIssueDto,
  CreateReceiptDto,
  CreateSupplierDto,
  CreateSupplyItemDto,
  DisposeBatchDto,
  DocumentActionDto,
  UpdateDocumentDto,
} from './dto/warehouse.dto.js';
import { AuthenticatedWarehouseUser, WarehouseAccessGuard } from './warehouse.guard.js';
import { WarehouseService } from './warehouse.service.js';

@ApiTags('Warehouse')
@ApiBearerAuth()
@UseGuards(WarehouseAccessGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @ApiOperation({ summary: 'Tổng quan tồn kho (Tab 1)' })
  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @ApiOperation({ summary: 'Danh mục vật tư và tồn theo lô (Tab 2)' })
  @Get('items')
  items(@Query('group') group?: string, @Query('search') search?: string) {
    return this.service.items(group, search);
  }

  @ApiOperation({ summary: 'Tạo mới vật tư y tế (sinh mã VT-xxxx)' })
  @Post('items')
  createItem(@Body() dto: CreateSupplyItemDto) {
    return this.service.createSupplyItem(dto);
  }

  @ApiOperation({ summary: 'Lịch sử sử dụng vật tư phòng khám (Tab 2)' })
  @Get('usage')
  usage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('doctorId') doctorId?: string,
    @Query('roomId') roomId?: string,
    @Query('supplyCode') supplyCode?: string,
  ) {
    return this.service.usage({
      startDate,
      endDate,
      doctorId: doctorId ? Number(doctorId) : undefined,
      roomId: roomId ? Number(roomId) : undefined,
      supplyCode,
    });
  }

  @ApiOperation({ summary: 'Danh sách chứng từ kho (Tab 3)' })
  @Get('documents')
  documents(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.documents({ type, status, startDate, endDate });
  }

  @ApiOperation({ summary: 'Chi tiết một chứng từ kho' })
  @Get('documents/:id')
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.service.getDocument(id);
  }

  @ApiOperation({ summary: 'Danh mục nhà cung cấp' })
  @Get('suppliers')
  suppliers() {
    return this.service.suppliers();
  }

  @ApiOperation({ summary: 'Tạo mới nhà cung cấp' })
  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.service.createSupplier(dto);
  }

  @ApiOperation({ summary: 'Dữ liệu ngữ cảnh phòng khám (bệnh nhân, bác sĩ, phòng khám, lượt khám)' })
  @Get('clinic-context')
  getClinicContext() {
    return this.service.getClinicContext();
  }

  @ApiOperation({ summary: 'Tạo phiếu nhập kho (MVT)' })
  @Post('documents/receipts')
  createReceipt(
    @Body() dto: CreateReceiptDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.createReceipt(dto, req.user?.sub);
  }

  @ApiOperation({ summary: 'Tạo phiếu xuất kho (XVT)' })
  @Post('documents/issues')
  createIssue(
    @Body() dto: CreateIssueDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.createIssue(dto, req.user?.sub);
  }

  @ApiOperation({ summary: 'Cập nhật phiếu nháp' })
  @Put('documents/:id')
  updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.updateDocument(id, dto, req.user?.sub);
  }

  @ApiOperation({ summary: 'In phiếu kho' })
  @Post('documents/:id/print')
  print(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.print(id, req.user?.sub);
  }

  @ApiOperation({ summary: 'Ghi sổ chứng từ kho' })
  @Post('documents/:id/post')
  post(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DocumentActionDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.post(id, req.user?.sub, dto.idempotencyKey);
  }

  @ApiOperation({ summary: 'Hủy chứng từ kho' })
  @Post('documents/:id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelDocumentDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.cancel(id, req.user?.sub, dto.reason);
  }

  @ApiOperation({ summary: 'Xóa chứng từ kho nháp (lưu vào StockDocumentDeleted)' })
  @Delete('documents/:id')
  deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Query('reason') reason: string,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.deleteDocument(id, reason, req.user?.sub);
  }

  @ApiOperation({ summary: 'Hủy sản phẩm hư hỏng hoặc hết hạn từ lô (tự động chuyển sang InventoryBatchDeleted)' })
  @Post('batches/:id/dispose')
  disposeBatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DisposeBatchDto,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.disposeBatch(id, dto, req.user?.sub);
  }

  @ApiOperation({ summary: 'Xóa / ngừng kinh doanh sản phẩm (chuyển sang MedicalSupplyDeleted và InventoryBatchDeleted)' })
  @Delete('items/:id')
  deleteItem(
    @Param('id', ParseIntPipe) id: number,
    @Query('reason') reason: string,
    @Req() req: Request & { user?: AuthenticatedWarehouseUser },
  ) {
    return this.service.deleteSupplyItem(id, reason, req.user?.sub);
  }

  @ApiOperation({ summary: 'Tra cứu các bản ghi đã xóa / hủy được sao lưu trong các bảng *Deleted của phân hệ Kho' })
  @Get('backup/deleted')
  getDeletedBackups() {
    return this.service.getDeletedBackups();
  }
}
