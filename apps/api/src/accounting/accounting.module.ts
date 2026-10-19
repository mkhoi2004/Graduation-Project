import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AccountingAccessGuard } from './accounting.guard.js';
import { AccountingController } from './accounting.controller.js';
import { AccountingService } from './accounting.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AccountingController],
  providers: [AccountingService, AccountingAccessGuard],
  exports: [AccountingService],
})
export class AccountingModule {}
