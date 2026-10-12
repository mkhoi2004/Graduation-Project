using System.Data;
using Graduation.Api.Models;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public sealed class VisitRepository(SqlConnectionFactory factory)
{
    public async Task<IReadOnlyList<VisitView>> ListAsync(long? patientId, int page, int size, long? doctorId, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var command = new SqlCommand("""
            SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version
            FROM dbo.Visits WHERE (@PatientId IS NULL OR PatientId=@PatientId)
              AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)
            ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY
            """,connection);
        SqlParameters.Add(command,"@PatientId",SqlDbType.BigInt,patientId);
        SqlParameters.Add(command,"@Offset",SqlDbType.Int,(page-1)*size);
        SqlParameters.Add(command,"@Size",SqlDbType.Int,size);
        SqlParameters.Add(command,"@DoctorId",SqlDbType.BigInt,doctorId);
        var rows=new List<VisitView>();
        await using var reader=await command.ExecuteReaderAsync(ct);
        while(await reader.ReadAsync(ct)) rows.Add(Read(reader));
        return rows;
    }

    public async Task<VisitView?> GetAsync(long id,long? doctorId,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("""
            SELECT Id,PatientId,DoctorUserId,BranchCode,VisitType,Status,CreatedAt,Version FROM dbo.Visits WHERE Id=@Id
              AND (@DoctorId IS NULL OR DoctorUserId=@DoctorId)
            """,connection);
        SqlParameters.Add(command,"@Id",SqlDbType.BigInt,id);
        SqlParameters.Add(command,"@DoctorId",SqlDbType.BigInt,doctorId);
        await using var reader=await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)?Read(reader):null;
    }

    public async Task<long> CreateAsync(VisitInput input,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("""
            INSERT dbo.Visits(PatientId,DoctorUserId,BranchCode,VisitType)
            OUTPUT inserted.Id VALUES(@PatientId,@DoctorId,@Branch,@Type)
            """,connection);
        SqlParameters.Add(command,"@PatientId",SqlDbType.BigInt,input.PatientId);
        SqlParameters.Add(command,"@DoctorId",SqlDbType.BigInt,input.DoctorUserId);
        SqlParameters.Add(command,"@Branch",SqlDbType.VarChar,input.BranchCode.Trim(),40);
        SqlParameters.Add(command,"@Type",SqlDbType.VarChar,input.VisitType,30);
        return Convert.ToInt64(await command.ExecuteScalarAsync(ct));
    }

    public async Task<bool> SetStatusAsync(long id,string from,string to,int version,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("""
            UPDATE dbo.Visits SET Status=@To,Version=Version+1,
                StartedAt=CASE WHEN @To='IN_PROGRESS' AND StartedAt IS NULL THEN SYSUTCDATETIME() ELSE StartedAt END,
                ClosedAt=CASE WHEN @To='CLOSED' THEN SYSUTCDATETIME() ELSE ClosedAt END
            WHERE Id=@Id AND Status=@From AND Version=@Version
            """,connection);
        SqlParameters.Add(command,"@Id",SqlDbType.BigInt,id);
        SqlParameters.Add(command,"@From",SqlDbType.VarChar,from,30);
        SqlParameters.Add(command,"@To",SqlDbType.VarChar,to,30);
        SqlParameters.Add(command,"@Version",SqlDbType.Int,version);
        return await command.ExecuteNonQueryAsync(ct)==1;
    }

    private static VisitView Read(SqlDataReader r)=>new(r.GetInt64(0),r.GetInt64(1),r.IsDBNull(2)?null:r.GetInt64(2),
        r.GetString(3),r.GetString(4),r.GetString(5),r.GetDateTime(6),r.GetInt32(7));
}
