import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, type ActorRequest } from './auth.js';
import { ArchiveService } from './archive.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { patientErrors, searchPattern, type PatientInput } from './validation.js';

type PatientUpdate = PatientInput & { version: number };
type Row = { Id: unknown; FullName: string; DateOfBirth: Date | null; BirthYear: number | null; Phone: string | null; Version: number };
function view(row: Row) {
  return { id: routeId(row.Id), fullName: row.FullName,
    dateOfBirth: row.DateOfBirth ? row.DateOfBirth.toISOString().slice(0, 10) : null,
    birthYear: row.BirthYear, phone: row.Phone, version: row.Version };
}
function bindPatient(request: ReturnType<Database['request']>, input: PatientInput) {
  return request.input('Name', sql.NVarChar(200), input.fullName.trim())
    .input('Dob', sql.Date, input.dateOfBirth ? new Date(input.dateOfBirth + 'T00:00:00Z') : null)
    .input('Year', sql.SmallInt, input.birthYear ?? null)
    .input('Phone', sql.VarChar(20), input.phone?.trim() || null);
}

@Injectable()
export class PatientService {
  constructor(@Inject(Database) private readonly db: Database) {}
  private async audit(actor: number, action: string, id: number, detail: string | null, tx?: Parameters<Database['request']>[0]) {
    await this.db.request(tx).input('Actor', sql.BigInt, actor).input('Action', sql.VarChar(80), action)
      .input('Id', sql.BigInt, id).input('Detail', sql.NVarChar(2000), detail)
      .query("INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail) VALUES(@Actor,@Action,'Patients',@Id,@Detail)");
  }
  async list(search: unknown, page: unknown, size: unknown, actor: number, doctor: number | null) {
    const { offset, size: take } = paging(page, size);
    const rows = await this.db.request().input('Search', sql.NVarChar(240), searchPattern(search))
      .input('DoctorId', sql.BigInt, doctor).input('Offset', sql.Int, offset).input('Size', sql.Int, take)
      .query(`SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version FROM dbo.Patients AS p
        WHERE MergedIntoPatientId IS NULL AND (@Search IS NULL OR FullName LIKE @Search OR Phone LIKE @Search)
        AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))
        ORDER BY p.Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
    const patients = rows.recordset.map((row: Row) => view(row));
    for (const patient of patients) await this.audit(actor, 'READ', patient.id, 'list');
    return patients;
  }
  async get(id: number, actor: number, doctor: number | null) {
    const result = await this.db.request().input('Id', sql.BigInt, id).input('DoctorId', sql.BigInt, doctor)
      .query(`SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version FROM dbo.Patients AS p WHERE p.Id=@Id
        AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))`);
    if (!result.recordset.length) throw new NotFoundException();
    await this.audit(actor, 'READ', id, 'detail');
    return view(result.recordset[0] as Row);
  }
  async create(input: PatientInput, actor: number) {
    ensureValid(patientErrors(input));
    const id = await this.db.transaction(async tx => {
      const result = await bindPatient(this.db.request(tx), input)
        .query('INSERT dbo.Patients(FullName,DateOfBirth,BirthYear,Phone) OUTPUT inserted.Id VALUES(@Name,@Dob,@Year,@Phone)');
      const created = routeId(result.recordset[0].Id);
      await this.audit(actor, 'CREATE', created, null, tx);
      return created;
    });
    return this.get(id, actor, null);
  }
  async update(id: number, input: PatientUpdate, actor: number): Promise<void> {
    ensureValid(patientErrors(input));
    if (!Number.isSafeInteger(input.version) || input.version < 1) throw new BadRequestException('Phiên bản không hợp lệ.');
    const changed = await this.db.transaction(async tx => {
      const result = await bindPatient(this.db.request(tx), input).input('Id', sql.BigInt, id)
        .input('Version', sql.Int, input.version)
        .query(`UPDATE dbo.Patients SET FullName=@Name,DateOfBirth=@Dob,BirthYear=@Year,Phone=@Phone,
          UpdatedAt=SYSUTCDATETIME(),Version=Version+1
          WHERE Id=@Id AND Version=@Version AND MergedIntoPatientId IS NULL`);
      if (result.rowsAffected[0] === 1)
        await this.audit(actor, 'UPDATE', id, `version ${input.version} -> ${input.version + 1}`, tx);
      return result.rowsAffected[0] === 1;
    });
    if (!changed) throw new ConflictException('Hồ sơ không tồn tại, đã hợp nhất hoặc phiên bản đã thay đổi.');
  }
}

@Controller('api/patients')
@UseGuards(AuthGuard)
@Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
export class PatientsController {
  constructor(@Inject(PatientService) private readonly patients: PatientService, @Inject(ArchiveService) private readonly archive: ArchiveService) {}
  private doctor(request: ActorRequest) {
    const actor = request.actor!;
    return actor.roles.includes('DOCTOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('RECEPTIONIST') ? actor.id : null;
  }
  @Get()
  list(@Query('search') search: string, @Query('page') page: string, @Query('size') size: string, @Req() request: ActorRequest) {
    return this.patients.list(search, page, size, request.actor!.id, this.doctor(request));
  }
  @Get(':id')
  get(@Param('id') id: string, @Req() request: ActorRequest) {
    return this.patients.get(routeId(id), request.actor!.id, this.doctor(request));
  }
  @Post()
  @Roles('ADMIN', 'RECEPTIONIST')
  create(@Body() input: PatientInput, @Req() request: ActorRequest) {
    return this.patients.create(input, request.actor!.id);
  }
  @Put(':id')
  @Roles('ADMIN', 'RECEPTIONIST')
  @HttpCode(204)
  async update(@Param('id') id: string, @Body() input: PatientUpdate, @Req() request: ActorRequest) {
    await this.patients.update(routeId(id), input, request.actor!.id);
  }
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Query('reason') reason: string, @Req() request: ActorRequest) {
    deleted(await this.archive.delete('Patients', routeId(id), request.actor!.id, reason));
  }
}
