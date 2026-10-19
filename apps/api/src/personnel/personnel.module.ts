import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { PersonnelController } from './personnel.controller.js';
import { PersonnelAccessGuard } from './personnel.guard.js';
import { PersonnelService } from './personnel.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PersonnelController],
  providers: [PersonnelService, PersonnelAccessGuard, PrismaService],
  exports: [PersonnelService],
})
export class PersonnelModule {}
