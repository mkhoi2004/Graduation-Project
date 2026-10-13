import { Module } from '@nestjs/common';
import { Database } from './db.js';
import { AuthController, AuthGuard, AuthService, LoginRateGuard } from './auth.js';
import { ArchiveService } from './archive.js';
import { PatientService, PatientsController } from './patients.js';
import { ServiceCatalog, ServicesController } from './services.js';
import { VisitService, VisitsController } from './visits.js';
import { UsersService, UsersController } from './users.js';
import { DashboardController, DashboardService } from './dashboard.js';
import { HealthController } from './health.js';

@Module({
  controllers: [AuthController, PatientsController, ServicesController, VisitsController,
    UsersController, DashboardController, HealthController],
  providers: [
    Database, AuthService, AuthGuard, LoginRateGuard, ArchiveService,
    PatientService, ServiceCatalog, VisitService, UsersService, DashboardService,
    { provide: 'JWT_SECRET', useFactory: () => {
      const secret = process.env.JWT_KEY ?? process.env.Jwt__Key;
      if (!secret || Buffer.byteLength(secret, 'utf8') < 32)
        throw new Error('JWT_KEY phải có ít nhất 32 byte.');
      return secret;
    } },
  ],
})
export class AppModule {}
