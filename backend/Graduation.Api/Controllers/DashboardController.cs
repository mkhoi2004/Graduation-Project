using Graduation.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/dashboard"),Authorize(Roles="ADMIN,RECEPTIONIST")]
public sealed class DashboardController(SqlConnectionFactory factory):ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        await using var connection=await factory.OpenAsync(ct);
        await using var command=new SqlCommand("""
            SELECT (SELECT COUNT_BIG(*) FROM dbo.Patients WHERE MergedIntoPatientId IS NULL),
                   (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE CONVERT(date,CreatedAt)=CONVERT(date,SYSUTCDATETIME())),
                   (SELECT COUNT_BIG(*) FROM dbo.Visits WHERE Status IN ('REGISTERED','IN_PROGRESS','ON_HOLD')),
                   (SELECT COUNT_BIG(*) FROM dbo.PaymentTransactions WHERE Status='PENDING')
            """,connection);
        await using var reader=await command.ExecuteReaderAsync(ct);
        await reader.ReadAsync(ct);
        return Ok(new {patients=reader.GetInt64(0),visitsToday=reader.GetInt64(1),openVisits=reader.GetInt64(2),pendingPayments=reader.GetInt64(3)});
    }
}
