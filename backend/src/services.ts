import { Body, Controller, Delete, Get, HttpCode, Inject, Injectable, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ArchiveService } from './archive.js';
import { AuthGuard, Roles, type ActorRequest } from './auth.js';
import { Database, sql } from './db.js';
import { deleted, ensureValid, paging, routeId } from './http.js';
import { searchPattern, serviceErrors } from './validation.js';

type ServiceInput = { code: string; name: string; requiresConsent: boolean };

@Injectable()
export class ServiceCatalog {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(search: unknown, page: unknown, size: unknown) {
    const { offset, size: take } = paging(page, size);
    const result = await this.db.request().input('Search', sql.NVarChar(240), searchPattern(search))
      .input('Offset', sql.Int, offset).input('Size', sql.Int, take)
      .query(`SELECT Id,Code,Name,RequiresConsent,IsActive FROM dbo.Services
        WHERE (@Search IS NULL OR Code LIKE @Search OR Name LIKE @Search)
        ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY`);
    return result.recordset.map((row: { Id: unknown; Code: string; Name: string; RequiresConsent: boolean; IsActive: boolean }) =>
      ({ id: routeId(row.Id), code: row.Code, name: row.Name, requiresConsent: row.RequiresConsent, isActive: row.IsActive }));
  }
  async create(input: ServiceInput) {
    ensureValid(serviceErrors(input));
    const result = await this.db.request().input('Code', sql.VarChar(40), input.code.trim())
      .input('Name', sql.NVarChar(200), input.name.trim()).input('Consent', sql.Bit, input.requiresConsent)
      .query('INSERT dbo.Services(Code,Name,RequiresConsent) OUTPUT inserted.Id VALUES(@Code,@Name,@Consent)');
    return { id: routeId(result.recordset[0].Id) };
  }
}

@Controller('api/services')
@UseGuards(AuthGuard)
export class ServicesController {
  constructor(@Inject(ServiceCatalog) private readonly catalog: ServiceCatalog, @Inject(ArchiveService) private readonly archive: ArchiveService) {}
  @Get()
  list(@Query('search') search: string, @Query('page') page: string, @Query('size') size: string) {
    return this.catalog.list(search, page, size);
  }
  @Post()
  @Roles('ADMIN')
  create(@Body() input: ServiceInput) { return this.catalog.create(input); }
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Query('reason') reason: string, @Req() request: ActorRequest) {
    deleted(await this.archive.delete('Services', routeId(id), request.actor!.id, reason));
  }
}
