namespace Graduation.Api.Models;

public sealed record PatientInput(string FullName, DateOnly? DateOfBirth, short? BirthYear,
    string? Phone);
public sealed record PatientView(long Id, string FullName, DateOnly? DateOfBirth, short? BirthYear,
    string? Phone, int Version);
public sealed record PatientUpdate(string FullName, DateOnly? DateOfBirth, short? BirthYear,
    string? Phone, int Version);

public sealed record ServiceInput(string Code, string Name, bool RequiresConsent);
public sealed record ServiceView(long Id, string Code, string Name, bool RequiresConsent, bool IsActive);

public sealed record VisitInput(long PatientId, long? DoctorUserId, string BranchCode, string VisitType);
public sealed record VisitView(long Id, long PatientId, long? DoctorUserId, string BranchCode,
    string VisitType, string Status, DateTime CreatedAt, int Version);
public sealed record VisitStatusInput(string Status, int Version);

public sealed record LoginInput(string Username, string Password);
public sealed record LoginResult(string Token, string Username, string[] Roles);
public sealed record CreateUserInput(string Username, string DisplayName, string Password, string[] Roles);

public sealed record BillLine(decimal Quantity, decimal UnitPrice, decimal Discount, decimal Tax);
