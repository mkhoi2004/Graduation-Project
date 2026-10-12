using Graduation.Api.Models;

namespace Graduation.Api.Services;

public static class InputValidation
{
    public static Dictionary<string, string[]> Patient(PatientInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.FullName) || input.FullName.Trim().Length < 2 || input.FullName.Length > 200)
            errors["fullName"] = ["Họ tên phải có 2–200 ký tự."];
        if (input.DateOfBirth is null && input.BirthYear is null)
            errors["birth"] = ["Cần ngày hoặc năm sinh."];
        if (input.DateOfBirth is { } dob && dob > DateOnly.FromDateTime(DateTime.UtcNow))
            errors["dateOfBirth"] = ["Ngày sinh không được ở tương lai."];
        if (input.DateOfBirth is { } knownDob && input.BirthYear is { } knownYear && knownDob.Year != knownYear)
            errors["birthYear"] = ["Năm sinh không khớp ngày sinh."];
        if (input.BirthYear is { } year && (year < 1900 || year > DateTime.UtcNow.Year))
            errors["birthYear"] = ["Năm sinh không hợp lệ."];
        if (input.Phone is { Length: > 20 })
            errors["phone"] = ["Số liên hệ quá dài."];
        return errors;
    }

    public static Dictionary<string, string[]> Service(ServiceInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(input.Code) || input.Code.Length > 40)
            errors["code"] = ["Mã dịch vụ phải có 1–40 ký tự."];
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length < 2 || input.Name.Length > 200)
            errors["name"] = ["Tên dịch vụ phải có 2–200 ký tự."];
        return errors;
    }

    public static Dictionary<string, string[]> Visit(VisitInput input)
    {
        var errors = new Dictionary<string, string[]>();
        if (input.PatientId <= 0) errors["patientId"] = ["Bệnh nhân không hợp lệ."];
        if (input.DoctorUserId is <= 0) errors["doctorUserId"] = ["Bác sĩ không hợp lệ."];
        if (string.IsNullOrWhiteSpace(input.BranchCode) || input.BranchCode.Length > 40)
            errors["branchCode"] = ["Mã chi nhánh không hợp lệ."];
        if (input.VisitType is not ("STANDARD" or "FOLLOW_UP" or "WARRANTY"))
            errors["visitType"] = ["Loại lượt khám không hợp lệ."];
        return errors;
    }
}
