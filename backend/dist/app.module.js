var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
], AppModule);
export { AppModule };
