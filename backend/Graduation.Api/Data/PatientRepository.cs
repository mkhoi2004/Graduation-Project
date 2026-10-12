using System.Data;
using Graduation.Api.Models;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public sealed class PatientRepository(SqlConnectionFactory factory)
{
    public async Task<IReadOnlyList<PatientView>> ListAsync(string? search, int page, int size, long? doctorId, long actorId, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var command = new SqlCommand("""
            SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version
            FROM dbo.Patients AS p
            WHERE MergedIntoPatientId IS NULL AND (@Search IS NULL OR FullName LIKE @Search OR Phone LIKE @Search)
              AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits AS v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))
            ORDER BY p.Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY
            """, connection);
        var escaped = search?.Trim().Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
        SqlParameters.Add(command, "@Search", SqlDbType.NVarChar, string.IsNullOrEmpty(escaped) ? null : $"%{escaped}%", 240);
        SqlParameters.Add(command, "@Offset", SqlDbType.Int, (page - 1) * size);
        SqlParameters.Add(command, "@Size", SqlDbType.Int, size);
        SqlParameters.Add(command, "@DoctorId", SqlDbType.BigInt, doctorId);
        var rows = new List<PatientView>();
        await using (var reader = await command.ExecuteReaderAsync(ct))
            while (await reader.ReadAsync(ct)) rows.Add(Read(reader));
        foreach (var row in rows) await AuditAsync(connection,null,actorId,"READ","Patients",row.Id,"list",ct);
        return rows;
    }

    public async Task<PatientView?> GetAsync(long id, long? doctorId, long actorId, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var command = new SqlCommand("""
            SELECT Id,FullName,DateOfBirth,BirthYear,Phone,Version
            FROM dbo.Patients AS p WHERE p.Id=@Id
              AND (@DoctorId IS NULL OR EXISTS(SELECT 1 FROM dbo.Visits AS v WHERE v.PatientId=p.Id AND v.DoctorUserId=@DoctorId))
            """, connection);
        SqlParameters.Add(command, "@Id", SqlDbType.BigInt, id);
        SqlParameters.Add(command, "@DoctorId", SqlDbType.BigInt, doctorId);
        PatientView? result;
        await using (var reader = await command.ExecuteReaderAsync(ct))
            result = await reader.ReadAsync(ct) ? Read(reader) : null;
        if(result is not null) await AuditAsync(connection,null,actorId,"READ","Patients",id,"detail",ct);
        return result;
    }

    public async Task<long> CreateAsync(PatientInput input, long actorId, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        await using var command = new SqlCommand("""
            INSERT dbo.Patients(FullName,DateOfBirth,BirthYear,Phone)
            OUTPUT inserted.Id VALUES (@Name,@Dob,@Year,@Phone)
            """, connection,(SqlTransaction)transaction);
        BindPatient(command, input);
        try
        {
            var id=Convert.ToInt64(await command.ExecuteScalarAsync(ct));
            await AuditAsync(connection,(SqlTransaction)transaction,actorId,"CREATE","Patients",id,null,ct);
            await transaction.CommitAsync(ct);
            return id;
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task<bool> UpdateAsync(long id, PatientUpdate input, long actorId, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);
        await using var command = new SqlCommand("""
            UPDATE dbo.Patients SET FullName=@Name,DateOfBirth=@Dob,BirthYear=@Year,Phone=@Phone,
                UpdatedAt=SYSUTCDATETIME(),Version=Version+1
            WHERE Id=@Id AND Version=@Version AND MergedIntoPatientId IS NULL
            """, connection,(SqlTransaction)transaction);
        BindPatient(command, new PatientInput(input.FullName,input.DateOfBirth,input.BirthYear,input.Phone));
        SqlParameters.Add(command,"@Id",SqlDbType.BigInt,id);
        SqlParameters.Add(command,"@Version",SqlDbType.Int,input.Version);
        try
        {
            var updated=await command.ExecuteNonQueryAsync(ct)==1;
            if(updated) await AuditAsync(connection,(SqlTransaction)transaction,actorId,"UPDATE","Patients",id,$"version {input.Version} -> {input.Version+1}",ct);
            await transaction.CommitAsync(ct);
            return updated;
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    private static async Task AuditAsync(SqlConnection connection,SqlTransaction? transaction,long actorId,
        string action,string entity,long entityId,string? detail,CancellationToken ct)
    {
        await using var audit=new SqlCommand("""
            INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail)
            VALUES(@Actor,@Action,@Entity,@Id,@Detail)
            """,connection,transaction);
        SqlParameters.Add(audit,"@Actor",SqlDbType.BigInt,actorId);
        SqlParameters.Add(audit,"@Action",SqlDbType.VarChar,action,80);
        SqlParameters.Add(audit,"@Entity",SqlDbType.VarChar,entity,80);
        SqlParameters.Add(audit,"@Id",SqlDbType.BigInt,entityId);
        SqlParameters.Add(audit,"@Detail",SqlDbType.NVarChar,detail,2000);
        await audit.ExecuteNonQueryAsync(ct);
    }

    private static void BindPatient(SqlCommand command, PatientInput input)
    {
        SqlParameters.Add(command,"@Name",SqlDbType.NVarChar,input.FullName.Trim(),200);
        SqlParameters.Add(command,"@Dob",SqlDbType.Date,input.DateOfBirth?.ToDateTime(TimeOnly.MinValue));
        SqlParameters.Add(command,"@Year",SqlDbType.SmallInt,input.BirthYear);
        SqlParameters.Add(command,"@Phone",SqlDbType.VarChar,input.Phone?.Trim(),20);
    }

    private static PatientView Read(SqlDataReader r) => new(
        r.GetInt64(0), r.GetString(1), r.IsDBNull(2) ? null : DateOnly.FromDateTime(r.GetDateTime(2)),
        r.IsDBNull(3) ? null : r.GetInt16(3), r.IsDBNull(4) ? null : r.GetString(4),
        r.GetInt32(5));
}
