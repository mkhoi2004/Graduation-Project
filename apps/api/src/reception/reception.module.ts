import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReceptionController } from './reception.controller.js';
import { ReceptionService } from './reception.service.js';
import { ReceptionAccessGuard } from './reception-access.guard.js';
import { AccountingModule } from '../accounting/accounting.module.js';

@Module({
  imports: [AuthModule, AccountingModule],
  controllers: [ReceptionController],
  providers: [ReceptionService, ReceptionAccessGuard],
  exports: [ReceptionService],
})
export class ReceptionModule {}
