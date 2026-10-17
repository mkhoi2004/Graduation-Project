import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Redirect, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto.js';
import { PaymentsService } from './payments.service.js';
import { PaymentAccessGuard } from './payment-access.guard.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly config: ConfigService) {}

  @Post('momo')
  @UseGuards(PaymentAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo giao dịch thanh toán MoMo' })
  createMomoPayment(@Body() input: CreateMomoPaymentDto) { return this.payments.createMomoPayment(input); }

  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận thông báo kết quả từ MoMo' })
  async receiveIpn(@Body() payload: Record<string, unknown>) {
    await this.payments.handleMomoResult(payload);
    return { resultCode: 0, message: 'success' };
  }

  @Get('momo/return')
  @Redirect()
  @ApiOperation({ summary: 'Xử lý trang quay lại từ MoMo' })
  async receiveReturn(@Query() payload: Record<string, unknown>) {
    let state = 'failed';
    let orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
    try {
      const payment = await this.payments.handleMomoResult(payload);
      state = payment.status === 'PAID' ? 'success' : 'failed';
      orderId = payment.orderId;
    } catch { state = 'invalid'; }
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    return { url: `${frontendUrl}/reception/payment?momo=${state}&orderId=${encodeURIComponent(orderId)}`, statusCode: 302 };
  }

  @Get('momo/:orderId/status')
  @UseGuards(PaymentAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái giao dịch MoMo' })
  getStatus(@Param('orderId') orderId: string) { return this.payments.getStatus(orderId); }
}
