import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { Database, sql } from './db.js';
import { safeId } from './validation.js';

export type ArchiveResult = 'deleted' | 'notFound' | 'conflict';
const allowed = new Set(['Patients', 'Services', 'Visits']);

@Injectable()
export class ArchiveService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async delete(table: string, id: number, actorId: number, reason: string): Promise<ArchiveResult> {
    if (!allowed.has(table)) throw new BadRequestException('Bảng không hỗ trợ xóa.');
    safeId(id); safeId(actorId);
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 500)
      throw new BadRequestException('Cần lý do xóa (tối đa 500 ký tự).');
    return this.db.transaction(async transaction => {
      await this.db.request(transaction)
        .input('Actor', sql.NVarChar(128), String(actorId))
        .input('Reason', sql.NVarChar(500), reason.trim())
        .query("EXEC sys.sp_set_session_context @key=N'ActorId', @value=@Actor; EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=@Reason");
      const current = await this.db.request(transaction).input('Id', sql.BigInt, id)
        .query(table === 'Visits'
          ? 'SELECT Status FROM dbo.Visits WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id'
          : `SELECT Id FROM dbo.[${table}] WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id`);
      if (!current.recordset.length) return 'notFound';
      if (table === 'Visits' && current.recordset[0].Status !== 'REGISTERED') return 'conflict';
      try {
        await this.db.request(transaction).input('Id', sql.BigInt, id)
          .query(`DELETE FROM dbo.[${table}] WHERE Id=@Id`);
      } catch (error) {
        const number = (error as { number?: number })?.number;
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
}
