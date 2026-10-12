using System.Text;
using System.Threading.RateLimiting;
using Graduation.Api.Data;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.SqlClient;
using Microsoft.IdentityModel.Tokens;

var builder=WebApplication.CreateBuilder(args);
var jwtKey=builder.Configuration["Jwt:Key"];
if(string.IsNullOrWhiteSpace(jwtKey)||Encoding.UTF8.GetByteCount(jwtKey)<32)
    throw new InvalidOperationException("Set Jwt:Key to a secret of at least 32 bytes (for example via Jwt__Key environment variable).");

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<SqlConnectionFactory>();
builder.Services.AddScoped<PatientRepository>();
builder.Services.AddScoped<ServiceRepository>();
builder.Services.AddScoped<VisitRepository>();
builder.Services.AddScoped<ArchiveDeleteRepository>();
builder.Services.AddScoped<AuthRepository>();
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options=>
{
    options.TokenValidationParameters=new TokenValidationParameters
    {
        ValidateIssuer=true,ValidIssuer=builder.Configuration["Jwt:Issuer"],
        ValidateAudience=true,ValidAudience=builder.Configuration["Jwt:Audience"],
        ValidateIssuerSigningKey=true,
        IssuerSigningKey=new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime=true,ClockSkew=TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options=>options.AddPolicy("login",context=>RateLimitPartition.GetFixedWindowLimiter(
    context.Connection.RemoteIpAddress?.ToString()??"unknown",
    _=>new FixedWindowRateLimiterOptions { PermitLimit=5,Window=TimeSpan.FromMinutes(1),QueueLimit=0 })));
var origins=builder.Configuration.GetSection("Cors:Origins").Get<string[]>()??[];
builder.Services.AddCors(options=>options.AddPolicy("frontend",policy=>policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app=builder.Build();
app.UseExceptionHandler(errorApp=>errorApp.Run(async context=>
{
    var exception=context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var logger=context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("ApiErrors");
    if(exception is not null) logger.LogError(exception,"Request failed");
    var status=exception switch
    {
        SqlException { Number: 2601 or 2627 or 547 } => StatusCodes.Status409Conflict,
        SqlException { Number: >= 51000 and <= 51999 } => StatusCodes.Status409Conflict,
        SqlException { Number: 229 } => StatusCodes.Status403Forbidden,
        ArgumentException => StatusCodes.Status400BadRequest,
        _ => StatusCodes.Status500InternalServerError
    };
    context.Response.StatusCode=status;
    await Results.Problem(statusCode:status,title:status switch
    {
        409 => "Xung đột dữ liệu hoặc bản ghi đang được tham chiếu.",
        403 => "Không có quyền thực hiện.",
        400 => "Dữ liệu không hợp lệ.",
        _ => "Lỗi máy chủ."
    }).ExecuteAsync(context);
}));
app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health",()=>Results.Ok(new {status="ok"}));
app.MapGet("/health/ready",async (SqlConnectionFactory factory,CancellationToken ct)=>
{
    await using var connection=await factory.OpenAsync(ct);
    await using var command=new SqlCommand("SELECT 1",connection);
    await command.ExecuteScalarAsync(ct);
    return Results.Ok(new {status="ready"});
});

var bootstrapPassword=builder.Configuration["Bootstrap:AdminPassword"];
var seedLocalAccounts=builder.Configuration.GetValue<bool>("Bootstrap:SeedLocalAccounts");
if(seedLocalAccounts)
{
    if(!app.Environment.IsDevelopment())
        throw new InvalidOperationException("Local example accounts can only be seeded in Development.");
    using var scope=app.Services.CreateScope();
    var created=await scope.ServiceProvider.GetRequiredService<AuthRepository>().SeedLocalAccountsAsync(CancellationToken.None);
    app.Logger.LogInformation(created ? "Created local example accounts." : "Local example accounts skipped because users already exist.");
}
else if(!string.IsNullOrEmpty(bootstrapPassword))
{
    using var scope=app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AuthRepository>().BootstrapAsync(bootstrapPassword,CancellationToken.None);
}

app.Run();
