import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseAccessGuard } from './warehouse.guard.js';
import { WarehouseService } from './warehouse.service.js';

@Module({ imports: [AuthModule], controllers: [WarehouseController], providers: [WarehouseService, WarehouseAccessGuard], exports: [WarehouseService] })
export class WarehouseModule {}
