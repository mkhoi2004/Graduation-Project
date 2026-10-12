using Graduation.Api.Models;
using Graduation.Api.Services;

var failures = new List<string>();
void Check(string name, Action test)
{
    try { test(); Console.WriteLine($"PASS {name}"); }
    catch (Exception ex) { failures.Add($"FAIL {name}: {ex.Message}"); }
}

Check("patient requires a real name and birth information", () =>
{
    var errors = InputValidation.Patient(new PatientInput(" ", null, null, "0123"));
    if (!errors.ContainsKey("fullName") || !errors.ContainsKey("birth")) throw new Exception("missing validation errors");
});
Check("shared phone number remains valid", () =>
{
    var errors = InputValidation.Patient(new PatientInput("Nguyen Van A", new DateOnly(1995, 5, 2), null, "0912345678"));
    if (errors.Count != 0) throw new Exception("valid patient rejected");
});
Check("birth year must agree with an exact birth date", () =>
{
    var errors = InputValidation.Patient(new PatientInput("Nguyen Van A", new DateOnly(1995, 5, 2), 1996, null));
    if (!errors.ContainsKey("birthYear")) throw new Exception("contradictory birth data accepted");
});
Check("doctor assignment rejects invalid identifiers", () =>
{
    var errors = InputValidation.Visit(new VisitInput(1, 0, "MAIN", "STANDARD"));
    if (!errors.ContainsKey("doctorUserId")) throw new Exception("invalid doctor accepted");
});
Check("billing does not count deposit as another payer", () =>
{
    var total = BillingCalculator.NetPayable(new[] { new BillLine(1, 5_000_000m, 0m, 0m) }, 0m);
    BillingCalculator.ValidateAllocation(total, 5_000_000m, 0m);
    var remaining = BillingCalculator.Outstanding(5_000_000m, 3_000_000m, 2_000_000m, 0m, 0m);
    if (total != 5_000_000m || remaining != 0m) throw new Exception("deposit counted incorrectly");
});
Check("over-allocation and over-refund are rejected", () =>
{
    try { BillingCalculator.ValidateAllocation(100m, 90m, 20m); throw new Exception("over-allocation accepted"); }
    catch (ArgumentException) { }
    try { BillingCalculator.Outstanding(100m, 100m, 0m, 0m, 101m); throw new Exception("over-refund accepted"); }
    catch (ArgumentException) { }
});

Check("password hashes are salted and reject wrong password", () =>
{
    var one = PasswordHash.Create("StrongPass123@");
    var two = PasswordHash.Create("StrongPass123@");
    if (one == two || !PasswordHash.Verify("StrongPass123@", one) || PasswordHash.Verify("wrong", one))
        throw new Exception("password hash validation failed");
});
Check("password needs more than eight characters and a special character", () =>
{
    if (!PasswordHash.IsValid("Admin1234@") || PasswordHash.IsValid("Abc1234@") || PasswordHash.IsValid("Admin12345"))
        throw new Exception("password policy mismatch");
    try { PasswordHash.Create("Admin12345"); throw new Exception("missing special character accepted"); }
    catch (ArgumentException) { }
});
foreach (var failure in failures) Console.Error.WriteLine(failure);
return failures.Count == 0 ? 0 : 1;

