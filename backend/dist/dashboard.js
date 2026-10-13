var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Inject, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from './auth.js';
import { Database } from './db.js';
let DashboardService = class DashboardService {
    db;
    constructor(db) {
        this.db = db;
    }
    async get() {
        const result = await this.db.request().query(`SELECT
      (SELECT COUNT_BIG(*) FROM dbo.Patients WHERE MergedIntoPatientId IS NULL) AS Patients,
      (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE CONVERT(date,CreatedAt)=CONVERT(date,SYSUTCDATETIME())) AS VisitsToday,
      (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE Status IN ('REGISTERED','IN_PROGRESS','ON_HOLD')) AS OpenVisits,
      (SELECT COUNT_BIG(*) FROM dbo.PaymentTransactions WHERE Status='PENDING') AS PendingPayments`);
        const row = result.recordset[0];
        const count = (value) => {
            const parsed = Number(value);
            if (!Number.isSafeInteger(parsed) || parsed < 0)
                throw new Error('Bộ đếm vượt giới hạn an toàn.');
            return parsed;
        };
        return { patients: count(row.Patients), visitsToday: count(row.VisitsToday),
            openVisits: count(row.OpenVisits), pendingPayments: count(row.PendingPayments) };
    }
};
DashboardService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], DashboardService);
export { DashboardService };
let DashboardController = class DashboardController {
    dashboard;
    constructor(dashboard) {
        this.dashboard = dashboard;
    }
    get() { return this.dashboard.get(); }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "get", null);
DashboardController = __decorate([
    Controller('api/dashboard'),
    UseGuards(AuthGuard),
    Roles('ADMIN', 'RECEPTIONIST'),
    __param(0, Inject(DashboardService)),
    __metadata("design:paramtypes", [DashboardService])
], DashboardController);
export { DashboardController };
