import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { CreateMomoPaymentDto } from './dto/create-momo-payment.dto.js';
import { CreateVnpayPaymentDto } from './dto/create-vnpay-payment.dto.js';
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

  @Post('vnpay')
  @UseGuards(PaymentAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo giao dịch thanh toán VNPAY' })
  createVnpayPayment(@Body() input: CreateVnpayPaymentDto, @Req() req: Request) {
    const rawIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.ip || '127.0.0.1';
    const ipAddr = rawIp === '::1' ? '127.0.0.1' : rawIp;
    return this.payments.createVnpayPayment({
      intakeCode: input.intakeCode,
      amount: input.amount,
      bankCode: input.bankCode,
      ipAddr,
    });
  }

  @Get('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận thông báo kết quả từ VNPAY (IPN GET)' })
  async receiveVnpayIpnGet(@Query() payload: Record<string, unknown>) {
    return this.payments.handleVnpayIpn(payload);
  }

  @Post('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nhận thông báo kết quả từ VNPAY (IPN POST)' })
  async receiveVnpayIpnPost(@Body() body: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    const payload = Object.keys(body ?? {}).length > 0 ? body : query;
    return this.payments.handleVnpayIpn(payload);
  }

  @Get('vnpay/return')
  @Redirect()
  @ApiOperation({ summary: 'Xử lý trang quay lại từ VNPAY' })
  async receiveVnpayReturn(@Query() payload: Record<string, unknown>) {
    let state = 'failed';
    let orderId = typeof payload.vnp_TxnRef === 'string' ? payload.vnp_TxnRef : '';
    try {
      const payment = await this.payments.handleVnpayResult(payload);
      state = payment.status === 'PAID' ? 'success' : 'failed';
      orderId = payment.orderId;
    } catch {
      state = 'invalid';
    }
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    return {
      url: `${frontendUrl}/reception/payment?vnpay=${state}&orderId=${encodeURIComponent(orderId)}`,
      statusCode: 302,
    };
  }

  @Get('vnpay/:orderId/status')
  @UseGuards(PaymentAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra trạng thái giao dịch VNPAY' })
  getVnpayStatus(@Param('orderId') orderId: string) {
    return this.payments.getStatus(orderId);
  }
}
