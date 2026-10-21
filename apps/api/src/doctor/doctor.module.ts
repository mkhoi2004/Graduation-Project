import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DoctorController } from './doctor.controller.js';
import { DoctorService } from './doctor.service.js';
import { DoctorAccessGuard } from './doctor-access.guard.js';
import { WarehouseServiceStub } from './stubs/warehouse-stub.service.js';
import { AccountingServiceStub } from './stubs/accounting-stub.service.js';
import { AccountingModule } from '../accounting/accounting.module.js';
import { DoctorQueueService } from './doctor-queue.service.js';

@Module({
  imports: [AuthModule, AccountingModule],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    DoctorQueueService,
    DoctorAccessGuard,
    WarehouseServiceStub,
    AccountingServiceStub,
  ],
  exports: [DoctorService, DoctorQueueService, WarehouseServiceStub, AccountingServiceStub],
})
export class DoctorModule {}
