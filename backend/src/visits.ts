import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.js';
import { AuthGuard, Roles, type ActorRequest } from './auth.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { visitErrors, type VisitInput } from './validation.js';

type Row = { Id: unknown; PatientId: unknown; DoctorUserId: unknown | null; BranchCode: string; VisitType: string; Status: string; CreatedAt: Date; Version: number };
function view(row: Row) {
  return { id: routeId(row.Id), patientId: routeId(row.PatientId),
    doctorUserId: row.DoctorUserId == null ? null : routeId(row.DoctorUserId),
    branchCode: row.BranchCode, visitType: row.VisitType, status: row.Status,
    createdAt: row.CreatedAt.toISOString(), version: row.Version };
}

@Injectable()
export class VisitService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(patientId: unknown, page: unknown, size: unknown, doctor: number | null) {
    const { offset, size: take } = paging(page, size);
    const patient = patientId == null || patientId === '' ? null : routeId(patientId);
    const result = await this.db.request().input('PatientId', sql.BigInt, patient)
      .input('DoctorId', sql.BigInt, doctor).input('Offset', sql.Int, offset).input('Size', sql.Int, take)
      .query(`SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version
        FROM dbo.Visits WHERE (@PatientId IS NULL OR PatientId=@PatientId)
        AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)
        ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
    return result.recordset.map((row: Row) => view(row));
  }
  async get(id: number, doctor: number | null) {
    const result = await this.db.request().input('Id', sql.BigInt, id).input('DoctorId', sql.BigInt, doctor)
      .query(`SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version
        FROM dbo.Visits WHERE Id=@Id AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)`);
    if (!result.recordset.length) throw new NotFoundException();
    return view(result.recordset[0] as Row);
  }
  async create(input: VisitInput) {
    ensureValid(visitErrors(input));
    const result = await this.db.request().input('PatientId', sql.BigInt, input.patientId)
      .input('DoctorId', sql.BigInt, input.doctorUserId ?? null)
      .input('Branch', sql.VarChar(40), input.branchCode.trim())
      .input('Type', sql.VarChar(30), input.visitType)
      .query(`DECLARE @Created TABLE(Id BIGINT);
        INSERT dbo.Visits(PatientId,DoctorUserId,BranchCode,VisitType)
        OUTPUT inserted.Id INTO @Created VALUES(@PatientId,@DoctorId,@Branch,@Type);
        SELECT Id FROM @Created`);
    return this.get(routeId(result.recordset[0].Id), null);
  }
}

@Controller('api/visits')
@UseGuards(AuthGuard)
@Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
export class VisitsController {
  constructor(@Inject(VisitService) private readonly visits: VisitService, @Inject(ArchiveService) private readonly archive: ArchiveService) {}
  private doctor(request: ActorRequest) {
    const actor = request.actor!;
    return actor.roles.includes('DOCTOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('RECEPTIONIST') ? actor.id : null;
  }
  @Get()
  list(@Query('patientId') patientId: string, @Query('page') page: string, @Query('size') size: string, @Req() request: ActorRequest) {
    return this.visits.list(patientId, page, size, this.doctor(request));
  }
  @Get(':id')
  get(@Param('id') id: string, @Req() request: ActorRequest) {
    return this.visits.get(routeId(id), this.doctor(request));
  }
  @Post()
  @Roles('ADMIN', 'RECEPTIONIST')
  create(@Body() input: VisitInput) { return this.visits.create(input); }
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Query('reason') reason: string, @Req() request: ActorRequest) {
    deleted(await this.archive.delete('Visits', routeId(id), request.actor!.id, reason));
  }
}
