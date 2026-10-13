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
import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from './auth.js';
import { ArchiveService } from './archive.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { patientErrors, searchPattern } from './validation.js';
function view(row) {
    return { id: routeId(row.Id), fullName: row.FullName,
        dateOfBirth: row.DateOfBirth ? row.DateOfBirth.toISOString().slice(0, 10) : null,
        birthYear: row.BirthYear, phone: row.Phone, version: row.Version };
}
function bindPatient(request, input) {
    return request.input('Name', sql.NVarChar(200), input.fullName.trim())
        .input('Dob', sql.Date, input.dateOfBirth ? new Date(input.dateOfBirth + 'T00:00:00Z') : null)
        .input('Year', sql.SmallInt, input.birthYear ?? null)
        .input('Phone', sql.VarChar(20), input.phone?.trim() || null);
}
let PatientService = class PatientService {
    db;
    constructor(db) {
        this.db = db;
    }
    async audit(actor, action, id, detail, tx) {
        await this.db.request(tx).input('Actor', sql.BigInt, actor).input('Action', sql.VarChar(80), action)
            .input('Id', sql.BigInt, id).input('Detail', sql.NVarChar(2000), detail)
            .query("INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail) VALUES(@Actor,@Action,'Patients',@Id,@Detail)");
    }
    async list(search, page, size, actor, doctor) {
        const { offset, size: take } = paging(page, size);
        const rows = await this.db.request().input('Search', sql.NVarChar(240), searchPattern(search))
            .input('DoctorId', sql.BigInt, doctor).input('Offset', sql.Int, offset).input('Size', sql.Int, take)
            .query(`SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version FROM dbo.Patients AS p
        WHERE MergedIntoPatientId IS NULL AND (@Search IS NULL OR FullName LIKE @Search OR Phone LIKE @Search)
        AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))
        ORDER BY p.Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
        const patients = rows.recordset.map((row) => view(row));
        for (const patient of patients)
            await this.audit(actor, 'READ', patient.id, 'list');
        return patients;
    }
    async get(id, actor, doctor) {
        const result = await this.db.request().input('Id', sql.BigInt, id).input('DoctorId', sql.BigInt, doctor)
            .query(`SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version FROM dbo.Patients AS p WHERE p.Id=@Id
        AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))`);
        if (!result.recordset.length)
            throw new NotFoundException();
        await this.audit(actor, 'READ', id, 'detail');
        return view(result.recordset[0]);
    }
    async create(input, actor) {
        ensureValid(patientErrors(input));
        const id = await this.db.transaction(async (tx) => {
            const result = await bindPatient(this.db.request(tx), input)
                .query('INSERT dbo.Patients(FullName,DateOfBirth,BirthYear,Phone) OUTPUT inserted.Id VALUES(@Name,@Dob,@Year,@Phone)');
            const created = routeId(result.recordset[0].Id);
            await this.audit(actor, 'CREATE', created, null, tx);
            return created;
        });
        return this.get(id, actor, null);
    }
    async update(id, input, actor) {
        ensureValid(patientErrors(input));
        if (!Number.isSafeInteger(input.version) || input.version < 1)
            throw new BadRequestException('Phiên bản không hợp lệ.');
        const changed = await this.db.transaction(async (tx) => {
            const result = await bindPatient(this.db.request(tx), input).input('Id', sql.BigInt, id)
                .input('Version', sql.Int, input.version)
                .query(`UPDATE dbo.Patients SET FullName=@Name,DateOfBirth=@Dob,BirthYear=@Year,Phone=@Phone,
          UpdatedAt=SYSUTCDATETIME(),Version=Version+1
          WHERE Id=@Id AND Version=@Version AND MergedIntoPatientId IS NULL`);
            if (result.rowsAffected[0] === 1)
                await this.audit(actor, 'UPDATE', id, `version ${input.version} -> ${input.version + 1}`, tx);
            return result.rowsAffected[0] === 1;
        });
        if (!changed)
            throw new ConflictException('Hồ sơ không tồn tại, đã hợp nhất hoặc phiên bản đã thay đổi.');
    }
};
PatientService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], PatientService);
export { PatientService };
let PatientsController = class PatientsController {
    patients;
    archive;
    constructor(patients, archive) {
        this.patients = patients;
        this.archive = archive;
    }
    doctor(request) {
        const actor = request.actor;
        return actor.roles.includes('DOCTOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('RECEPTIONIST') ? actor.id : null;
    }
    list(search, page, size, request) {
        return this.patients.list(search, page, size, request.actor.id, this.doctor(request));
    }
    get(id, request) {
        return this.patients.get(routeId(id), request.actor.id, this.doctor(request));
    }
    create(input, request) {
        return this.patients.create(input, request.actor.id);
    }
    async update(id, input, request) {
        await this.patients.update(routeId(id), input, request.actor.id);
    }
    async remove(id, reason, request) {
        deleted(await this.archive.delete('Patients', routeId(id), request.actor.id, reason));
    }
};
__decorate([
    Get(),
    __param(0, Query('search')),
    __param(1, Query('page')),
    __param(2, Query('size')),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "get", null);
__decorate([
    Post(),
    Roles('ADMIN', 'RECEPTIONIST'),
    __param(0, Body()),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PatientsController.prototype, "create", null);
__decorate([
    Put(':id'),
    Roles('ADMIN', 'RECEPTIONIST'),
    HttpCode(204),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "update", null);
__decorate([
    Delete(':id'),
    Roles('ADMIN'),
    HttpCode(204),
    __param(0, Param('id')),
    __param(1, Query('reason')),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PatientsController.prototype, "remove", null);
PatientsController = __decorate([
    Controller('api/patients'),
    UseGuards(AuthGuard),
    Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
    __param(0, Inject(PatientService)),
    __param(1, Inject(ArchiveService)),
    __metadata("design:paramtypes", [PatientService, ArchiveService])
], PatientsController);
export { PatientsController };
