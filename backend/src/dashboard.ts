import { Controller, Get, Inject, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from './auth.js';
import { Database } from './db.js';

@Injectable()
export class DashboardService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async get() {
    const result = await this.db.request().query(`SELECT
      (SELECT COUNT_BIG(*) FROM dbo.Patients WHERE MergedIntoPatientId IS NULL) AS Patients,
      (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE CONVERT(date,CreatedAt)=CONVERT(date,SYSUTCDATETIME())) AS VisitsToday,
      (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE Status IN ('REGISTERED','IN_PROGRESS','ON_HOLD')) AS OpenVisits,
      (SELECT COUNT_BIG(*) FROM dbo.PaymentTransactions WHERE Status='PENDING') AS PendingPayments`);
    const row = result.recordset[0];
    const count = (value: unknown) => {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error('Bộ đếm vượt giới hạn an toàn.');
      return parsed;
    };
    return { patients: count(row.Patients), visitsToday: count(row.VisitsToday),
      openVisits: count(row.OpenVisits), pendingPayments: count(row.PendingPayments) };
  }
}

@Controller('api/dashboard')
@UseGuards(AuthGuard)
@Roles('ADMIN', 'RECEPTIONIST')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}
  @Get()
  get() { return this.dashboard.get(); }
}
