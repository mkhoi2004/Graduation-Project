import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MomoGateway } from './momo.gateway.js';
import { PrismaPaymentRepository } from './payment.repository.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentGateway, PaymentRepository, PaymentsService } from './payments.service.js';
import { PaymentAccessGuard } from './payment-access.guard.js';
import { AccountingModule } from '../accounting/accounting.module.js';

@Module({
  imports: [AuthModule, AccountingModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentAccessGuard,
    { provide: PaymentRepository, useClass: PrismaPaymentRepository },
    { provide: PaymentGateway, useClass: MomoGateway },
  ],
})
export class PaymentsModule {}
