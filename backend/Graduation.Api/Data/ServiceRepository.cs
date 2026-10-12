using System.Data;
using Graduation.Api.Models;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public sealed class ServiceRepository(SqlConnectionFactory factory)
{
    public async Task<IReadOnlyList<ServiceView>> ListAsync(string? search, int page, int size, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var command = new SqlCommand("""
            SELECT Id,Code,Name,RequiresConsent,IsActive FROM dbo.Services
            WHERE (@Search IS NULL OR Code LIKE @Search OR Name LIKE @Search)
            ORDER BY Id DESC OFFSET @Offset ROWS FETCH NEXT @Size ROWS ONLY
            """, connection);
        var escaped = search?.Trim().Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
        SqlParameters.Add(command,"@Search",SqlDbType.NVarChar,string.IsNullOrEmpty(escaped)?null:$"%{escaped}%",240);
        SqlParameters.Add(command,"@Offset",SqlDbType.Int,(page-1)*size);
        SqlParameters.Add(command,"@Size",SqlDbType.Int,size);
        var rows = new List<ServiceView>();
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) rows.Add(new ServiceView(reader.GetInt64(0),reader.GetString(1),reader.GetString(2),reader.GetBoolean(3),reader.GetBoolean(4)));
        return rows;
    }

    public async Task<long> CreateAsync(ServiceInput input, CancellationToken ct)
    {
        await using var connection = await factory.OpenAsync(ct);
        await using var command = new SqlCommand("""
            INSERT dbo.Services(Code,Name,RequiresConsent) OUTPUT inserted.Id VALUES(@Code,@Name,@Consent)
            """,connection);
        SqlParameters.Add(command,"@Code",SqlDbType.VarChar,input.Code.Trim(),40);
        SqlParameters.Add(command,"@Name",SqlDbType.NVarChar,input.Name.Trim(),200);
        SqlParameters.Add(command,"@Consent",SqlDbType.Bit,input.RequiresConsent);
        return Convert.ToInt64(await command.ExecuteScalarAsync(ct));
    }
}
