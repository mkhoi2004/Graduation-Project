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
import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.js';
import { AuthGuard, Roles } from './auth.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { searchPattern, serviceErrors } from './validation.js';
let ServiceCatalog = class ServiceCatalog {
    db;
    constructor(db) {
        this.db = db;
    }
    async list(search, page, size) {
        const { offset, size: take } = paging(page, size);
        const result = await this.db.request().input('Search', sql.NVarChar(240), searchPattern(search))
            .input('Offset', sql.Int, offset).input('Size', sql.Int, take)
            .query(`SELECT Id,Code,Name,RequiresConsent,IsActive FROM dbo.Services
        WHERE (@Search IS NULL OR Code LIKE @Search OR Name LIKE @Search)
        ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
        return result.recordset.map((row) => ({ id: routeId(row.Id), code: row.Code, name: row.Name, requiresConsent: row.RequiresConsent, isActive: row.IsActive }));
    }
    async create(input) {
        ensureValid(serviceErrors(input));
        const result = await this.db.request().input('Code', sql.VarChar(40), input.code.trim())
            .input('Name', sql.NVarChar(200), input.name.trim()).input('Consent', sql.Bit, input.requiresConsent)
            .query('INSERT dbo.Services(Code,Name,RequiresConsent) OUTPUT inserted.Id VALUES(@Code,@Name,@Consent)');
        return { id: routeId(result.recordset[0].Id) };
    }
};
ServiceCatalog = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], ServiceCatalog);
export { ServiceCatalog };
let ServicesController = class ServicesController {
    catalog;
    archive;
    constructor(catalog, archive) {
        this.catalog = catalog;
        this.archive = archive;
    }
    list(search, page, size) {
        return this.catalog.list(search, page, size);
    }
    create(input) { return this.catalog.create(input); }
    async remove(id, reason, request) {
        deleted(await this.archive.delete('Services', routeId(id), request.actor.id, reason));
    }
};
__decorate([
    Get(),
    __param(0, Query('search')),
    __param(1, Query('page')),
    __param(2, Query('size')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "list", null);
__decorate([
    Post(),
    Roles('ADMIN'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ServicesController.prototype, "create", null);
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
], ServicesController.prototype, "remove", null);
ServicesController = __decorate([
    Controller('api/services'),
    UseGuards(AuthGuard),
    __param(0, Inject(ServiceCatalog)),
    __param(1, Inject(ArchiveService)),
    __metadata("design:paramtypes", [ServiceCatalog, ArchiveService])
], ServicesController);
export { ServicesController };
