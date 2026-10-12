using System.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public sealed record AuthUser(long Id,string Username,string PasswordHash,string[] Roles);

public sealed class AuthRepository(SqlConnectionFactory factory)
{
    public async Task<AuthUser?> FindAsync(string username,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("SELECT Id,Username,PasswordHash FROM dbo.Users WHERE Username=@Username AND IsActive=1",connection);
        SqlParameters.Add(command,"@Username",SqlDbType.VarChar,username,100);
        long id; string name; string hash;
        await using (var reader=await command.ExecuteReaderAsync(ct))
        {
            if (!await reader.ReadAsync(ct)) return null;
            id=reader.GetInt64(0); name=reader.GetString(1); hash=reader.GetString(2);
        }
        var roles=await RolesAsync(connection,id,ct);
        return new AuthUser(id,name,hash,roles);
    }

    public async Task<IReadOnlyList<object>> ListUsersAsync(CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("SELECT Id,Username,DisplayName,IsActive FROM dbo.Users ORDER BY Id DESC",connection);
        var rows=new List<object>();
        await using var reader=await command.ExecuteReaderAsync(ct);
        while(await reader.ReadAsync(ct)) rows.Add(new {id=reader.GetInt64(0),username=reader.GetString(1),displayName=reader.GetString(2),isActive=reader.GetBoolean(3)});
        return rows;
    }

    public async Task<IReadOnlyList<object>> ListRolesAsync(CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("SELECT Id,Code,Name FROM dbo.Roles ORDER BY Code",connection);
        var rows=new List<object>();
        await using var reader=await command.ExecuteReaderAsync(ct);
        while(await reader.ReadAsync(ct)) rows.Add(new {id=reader.GetInt64(0),code=reader.GetString(1),name=reader.GetString(2)});
        return rows;
    }

    public async Task<long> CreateUserAsync(CreateUserInput input,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var transaction=await connection.BeginTransactionAsync(ct);
        try
        {
            await using var command=new SqlCommand("INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES(@Username,@Name,@Hash)",connection,(SqlTransaction)transaction);
            SqlParameters.Add(command,"@Username",SqlDbType.VarChar,input.Username.Trim(),100);
            SqlParameters.Add(command,"@Name",SqlDbType.NVarChar,input.DisplayName.Trim(),150);
            SqlParameters.Add(command,"@Hash",SqlDbType.VarChar,PasswordHash.Create(input.Password),500);
            var id=Convert.ToInt64(await command.ExecuteScalarAsync(ct));
            foreach(var role in input.Roles.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                await using var assign=new SqlCommand("INSERT dbo.UserRoles(UserId,RoleId) SELECT @UserId,Id FROM dbo.Roles WHERE Code=@Code; SELECT @@ROWCOUNT",connection,(SqlTransaction)transaction);
                SqlParameters.Add(assign,"@UserId",SqlDbType.BigInt,id);
                SqlParameters.Add(assign,"@Code",SqlDbType.VarChar,role.ToUpperInvariant(),40);
                if(Convert.ToInt32(await assign.ExecuteScalarAsync(ct))!=1) throw new ArgumentException($"Vai trò không tồn tại: {role}");
            }
            await transaction.CommitAsync(ct);
            return id;
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task<long> CreateRoleAsync(string code,string name,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("INSERT dbo.Roles(Code,Name) OUTPUT inserted.Id VALUES(@Code,@Name)",connection);
        SqlParameters.Add(command,"@Code",SqlDbType.VarChar,code.ToUpperInvariant(),40);
        SqlParameters.Add(command,"@Name",SqlDbType.NVarChar,name,120);
        return Convert.ToInt64(await command.ExecuteScalarAsync(ct));
    }

    public async Task BootstrapAsync(string password,CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var transaction=await connection.BeginTransactionAsync(IsolationLevel.Serializable,ct);
        try
        {
            await using var count=new SqlCommand("SELECT COUNT_BIG(*) FROM dbo.Users WITH (UPDLOCK,HOLDLOCK)",connection,(SqlTransaction)transaction);
            if(Convert.ToInt64(await count.ExecuteScalarAsync(ct))>0) { await transaction.CommitAsync(ct); return; }
            await using var role=new SqlCommand("""
                IF EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='ADMIN')
                    SELECT Id FROM dbo.Roles WHERE Code='ADMIN';
                ELSE
                    INSERT dbo.Roles(Code,Name) OUTPUT inserted.Id VALUES('ADMIN',N'Quản trị hệ thống');
                """,connection,(SqlTransaction)transaction);
            var roleId=Convert.ToInt64(await role.ExecuteScalarAsync(ct));
            await using var user=new SqlCommand("INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES('admin',N'Quản trị viên',@Hash)",connection,(SqlTransaction)transaction);
            SqlParameters.Add(user,"@Hash",SqlDbType.VarChar,PasswordHash.Create(password),500);
            var userId=Convert.ToInt64(await user.ExecuteScalarAsync(ct));
            await using var link=new SqlCommand("INSERT dbo.UserRoles(UserId,RoleId) VALUES(@UserId,@RoleId)",connection,(SqlTransaction)transaction);
            SqlParameters.Add(link,"@UserId",SqlDbType.BigInt,userId);
            SqlParameters.Add(link,"@RoleId",SqlDbType.BigInt,roleId);
            await link.ExecuteNonQueryAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    public async Task<bool> SeedLocalAccountsAsync(CancellationToken ct)
    {
        var accounts = new (string Username,string DisplayName,string Password,string RoleCode,string RoleName)[]
        {
            ("admin","Quản trị viên","Admin1234@","ADMIN","Quản trị hệ thống"),
            ("receptionist","Lễ tân","Reception1234@","RECEPTIONIST","Lễ tân"),
            ("doctor","Bác sĩ","Doctor1234@","DOCTOR","Bác sĩ")
        };
        await using var connection=await factory.OpenAsync(ct);
        await using var transaction=await connection.BeginTransactionAsync(IsolationLevel.Serializable,ct);
        try
        {
            await using var count=new SqlCommand("SELECT COUNT_BIG(*) FROM dbo.Users WITH (UPDLOCK,HOLDLOCK)",connection,(SqlTransaction)transaction);
            if(Convert.ToInt64(await count.ExecuteScalarAsync(ct))>0)
            {
                await transaction.CommitAsync(ct);
                return false;
            }
            foreach(var account in accounts)
            {
                await using var role=new SqlCommand("""
                    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WITH (UPDLOCK,HOLDLOCK) WHERE Code=@Code)
                        INSERT dbo.Roles(Code,Name) VALUES(@Code,@RoleName);
                    SELECT Id FROM dbo.Roles WHERE Code=@Code;
                    """,connection,(SqlTransaction)transaction);
                SqlParameters.Add(role,"@Code",SqlDbType.VarChar,account.RoleCode,40);
                SqlParameters.Add(role,"@RoleName",SqlDbType.NVarChar,account.RoleName,120);
                var roleId=Convert.ToInt64(await role.ExecuteScalarAsync(ct));

                await using var user=new SqlCommand("INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES(@Username,@Name,@Hash)",connection,(SqlTransaction)transaction);
                SqlParameters.Add(user,"@Username",SqlDbType.VarChar,account.Username,100);
                SqlParameters.Add(user,"@Name",SqlDbType.NVarChar,account.DisplayName,150);
                SqlParameters.Add(user,"@Hash",SqlDbType.VarChar,PasswordHash.Create(account.Password),500);
                var userId=Convert.ToInt64(await user.ExecuteScalarAsync(ct));

                await using var assignment=new SqlCommand("INSERT dbo.UserRoles(UserId,RoleId) VALUES(@UserId,@RoleId)",connection,(SqlTransaction)transaction);
                SqlParameters.Add(assignment,"@UserId",SqlDbType.BigInt,userId);
                SqlParameters.Add(assignment,"@RoleId",SqlDbType.BigInt,roleId);
                await assignment.ExecuteNonQueryAsync(ct);
            }
            await transaction.CommitAsync(ct);
            return true;
        }
        catch { await transaction.RollbackAsync(CancellationToken.None); throw; }
    }

    private static async Task<string[]> RolesAsync(SqlConnection connection,long id,CancellationToken ct)
    {
        await using var command=new SqlCommand("SELECT r.Code FROM dbo.Roles r JOIN dbo.UserRoles ur ON ur.RoleId=r.Id WHERE ur.UserId=@Id",connection);
        SqlParameters.Add(command,"@Id",SqlDbType.BigInt,id);
        var roles=new List<string>();
        await using var reader=await command.ExecuteReaderAsync(ct);
        while(await reader.ReadAsync(ct)) roles.Add(reader.GetString(0));
        return [..roles];
    }
}
