using System.Security.Claims;
using Graduation.Api.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/patients"),Authorize(Roles="ADMIN,RECEPTIONIST,DOCTOR")]
public sealed class PatientsController(PatientRepository patients,ArchiveDeleteRepository archive):ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery]string? search,[FromQuery]int page=1,[FromQuery]int size=20,CancellationToken ct=default)
    {
        if(page<1||size<1||size>100) return BadRequest("page phải >=1 và size từ 1 đến 100.");
        return Ok(await patients.ListAsync(search,page,size,DoctorScope(),ActorId(),ct));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id,CancellationToken ct)
    {
        var patient=await patients.GetAsync(id,DoctorScope(),ActorId(),ct);
        return patient is null?NotFound():Ok(patient);
    }

    [HttpPost,Authorize(Roles="ADMIN,RECEPTIONIST")]
    public async Task<IActionResult> Create(PatientInput input,CancellationToken ct)
    {
        var errors=InputValidation.Patient(input);
        if(errors.Count>0) return ValidationProblem(new ValidationProblemDetails(errors));
        var id=await patients.CreateAsync(input,ActorId(),ct);
        return CreatedAtAction(nameof(Get),new {id},await patients.GetAsync(id,null,ActorId(),ct));
    }

    [HttpPut("{id:long}"),Authorize(Roles="ADMIN,RECEPTIONIST")]
    public async Task<IActionResult> Update(long id,PatientUpdate input,CancellationToken ct)
    {
        var errors=InputValidation.Patient(new PatientInput(input.FullName,input.DateOfBirth,input.BirthYear,input.Phone));
        if(input.Version<1) errors["version"]=["Phiên bản không hợp lệ."];
        if(errors.Count>0) return ValidationProblem(new ValidationProblemDetails(errors));
        return await patients.UpdateAsync(id,input,ActorId(),ct)?NoContent():Conflict("Hồ sơ không tồn tại, đã hợp nhất hoặc phiên bản đã thay đổi.");
    }

    [HttpDelete("{id:long}"),Authorize(Roles="ADMIN")]
    public async Task<IActionResult> Delete(long id,[FromQuery]string reason,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(reason)||reason.Length>500) return BadRequest("Cần lý do xóa (tối đa 500 ký tự).");
        var actor=User.FindFirstValue(ClaimTypes.NameIdentifier)??"unknown";
        return await archive.DeleteAsync("Patients",id,actor,reason,ct)==true?NoContent():NotFound();
    }

    private long? DoctorScope() => User.IsInRole("DOCTOR") && !User.IsInRole("ADMIN") && !User.IsInRole("RECEPTIONIST")
        ? long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;
    private long ActorId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
