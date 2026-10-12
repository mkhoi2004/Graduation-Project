using System.Data;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public sealed class ArchiveDeleteRepository(SqlConnectionFactory factory)
{
    private static readonly HashSet<string> AllowedTables = ["Patients", "Services", "Visits"];

    // null result means a guarded business state changed before the row lock was taken.
    public async Task<bool?> DeleteAsync(string table, long id, string actor, string reason, CancellationToken ct,
        string? requiredStatus = null)
    {
        if (!AllowedTables.Contains(table)) throw new ArgumentException("Bảng không hỗ trợ xóa.", nameof(table));
        await using var connection = await factory.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        try
        {
            await using (var context = new SqlCommand("""
                EXEC sys.sp_set_session_context @key=N'ActorId', @value=@Actor;
                EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=@Reason;
                """, connection, (SqlTransaction)transaction))
            {
                SqlParameters.Add(context,"@Actor",SqlDbType.NVarChar,actor,128);
                SqlParameters.Add(context,"@Reason",SqlDbType.NVarChar,reason,500);
                await context.ExecuteNonQueryAsync(ct);
            }
            if (requiredStatus is not null && table != "Visits") throw new ArgumentException("Trạng thái chỉ áp dụng cho lượt khám.");
            await using var exists = new SqlCommand(requiredStatus is null
                ? $"SELECT Id FROM dbo.[{table}] WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id"
                : "SELECT Status FROM dbo.Visits WITH (UPDLOCK,HOLDLOCK) WHERE Id=@Id",connection,(SqlTransaction)transaction);
            SqlParameters.Add(exists,"@Id",SqlDbType.BigInt,id);
            var current=await exists.ExecuteScalarAsync(ct);
            if(current is null) return false;
            if(requiredStatus is not null && !string.Equals((string)current,requiredStatus,StringComparison.Ordinal)) return null;
            await using var delete = new SqlCommand($"DELETE FROM dbo.[{table}] WHERE Id=@Id",connection,(SqlTransaction)transaction);
            SqlParameters.Add(delete,"@Id",SqlDbType.BigInt,id);
            await delete.ExecuteNonQueryAsync(ct);
            await using var audit=new SqlCommand("""
                INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail)
                VALUES(@ActorId,'DELETE',@Table,@Id,@Reason)
                """,connection,(SqlTransaction)transaction);
            SqlParameters.Add(audit,"@ActorId",SqlDbType.BigInt,long.Parse(actor));
            SqlParameters.Add(audit,"@Table",SqlDbType.VarChar,table,80);
            SqlParameters.Add(audit,"@Id",SqlDbType.BigInt,id);
            SqlParameters.Add(audit,"@Reason",SqlDbType.NVarChar,reason,500);
            await audit.ExecuteNonQueryAsync(ct);
            await transaction.CommitAsync(ct);
            return true;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }
}
