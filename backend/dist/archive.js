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
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { Database, sql } from './db.js';
import { safeId } from './validation.js';
const allowed = new Set(['Patients', 'Services', 'Visits']);
let ArchiveService = class ArchiveService {
    db;
    constructor(db) {
        this.db = db;
    }
    async delete(table, id, actorId, reason) {
        if (!allowed.has(table))
            throw new BadRequestException('Bảng không hỗ trợ xóa.');
        safeId(id);
        safeId(actorId);
        if (typeof reason !== 'string' || !reason.trim() || reason.length > 500)
            throw new BadRequestException('Cần lý do xóa (tối đa 500 ký tự).');
        return this.db.transaction(async (transaction) => {
            await this.db.request(transaction)
                .input('Actor', sql.NVarChar(128), String(actorId))
                .input('Reason', sql.NVarChar(500), reason.trim())
                .query("EXEC sys.sp_set_session_context @key=N'ActorId', @value=@Actor; EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=@Reason");
            const current = await this.db.request(transaction).input('Id', sql.BigInt, id)
                .query(table === 'Visits'
                ? 'SELECT Status FROM dbo.Visits WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id'
                : `SELECT Id FROM dbo.[${table}] WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id`);
            if (!current.recordset.length)
                return 'notFound';
            if (table === 'Visits' && current.recordset[0].Status !== 'REGISTERED')
                return 'conflict';
            try {
                await this.db.request(transaction).input('Id', sql.BigInt, id)
                    .query(`DELETE FROM dbo.[${table}] WHERE Id=@Id`);
            }
            catch (error) {
                const number = error?.number;
                if (number === 3621 || number === 547 || (number != null && number >= 51000 && number <= 51999))
                    throw new ConflictException('Bản ghi đang được tham chiếu hoặc trạng thái không cho phép xóa.');
                throw error;
            }
            await this.db.request(transaction)
                .input('ActorId', sql.BigInt, actorId).input('Table', sql.VarChar(80), table)
                .input('Id', sql.BigInt, id).input('Reason', sql.NVarChar(500), reason.trim())
                .query("INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail) VALUES(@ActorId,'DELETE',@Table,@Id,@Reason)");
            return 'deleted';
        });
    }
};
ArchiveService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], ArchiveService);
export { ArchiveService };
