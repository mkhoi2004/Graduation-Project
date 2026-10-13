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
import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, NotFoundException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.js';
import { AuthGuard, Roles } from './auth.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { visitErrors } from './validation.js';
function view(row) {
    return { id: routeId(row.Id), patientId: routeId(row.PatientId),
        doctorUserId: row.DoctorUserId == null ? null : routeId(row.DoctorUserId),
        branchCode: row.BranchCode, visitType: row.VisitType, status: row.Status,
        createdAt: row.CreatedAt.toISOString(), version: row.Version };
}
let VisitService = class VisitService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(patientId, page, size, doctor) {
        const { offset, size: take } = paging(page, size);
        const patient = patientId == null || patientId === '' ? null : routeId(patientId);
        const result = await this.db.request().input('PatientId', sql.BigInt, patient)
            .input('DoctorId', sql.BigInt, doctor).input('Offset', sql.Int, offset).input('Size', sql.Int, take)
            .query(`SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version
        FROM dbo.Visits WHERE (@PatientId IS NULL OR PatientId=@PatientId)
        AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)
        ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
        return result.recordset.map((row) => view(row));
    }
    async get(id, doctor) {
        const result = await this.db.request().input('Id', sql.BigInt, id).input('DoctorId', sql.BigInt, doctor)
            .query(`SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version
        FROM dbo.Visits WHERE Id=@Id AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)`);
        if (!result.recordset.length)
            throw new NotFoundException();
        return view(result.recordset[0]);
    }
    async create(input) {
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
};
VisitService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], VisitService);
export { VisitService };
let VisitsController = class VisitsController {
    visits;
    archive;
    constructor(visits, archive) {
        this.visits = visits;
        this.archive = archive;
    }
    doctor(request) {
        const actor = request.actor;
        return actor.roles.includes('DOCTOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('RECEPTIONIST') ? actor.id : null;
    }
    list(patientId, page, size, request) {
        return this.visits.list(patientId, page, size, this.doctor(request));
    }
    get(id, request) {
        return this.visits.get(routeId(id), this.doctor(request));
    }
    create(input) { return this.visits.create(input); }
    async remove(id, reason, request) {
        deleted(await this.archive.delete('Visits', routeId(id), request.actor.id, reason));
    }
};
__decorate([
    Get(),
    __param(0, Query('patientId')),
    __param(1, Query('page')),
    __param(2, Query('size')),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "list", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __param(1, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "get", null);
__decorate([
    Post(),
    Roles('ADMIN', 'RECEPTIONIST'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "create", null);
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
], VisitsController.prototype, "remove", null);
VisitsController = __decorate([
    Controller('api/visits'),
    UseGuards(AuthGuard),
    Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR'),
    __param(0, Inject(VisitService)),
    __param(1, Inject(ArchiveService)),
    __metadata("design:paramtypes", [VisitService, ArchiveService])
], VisitsController);
export { VisitsController };
