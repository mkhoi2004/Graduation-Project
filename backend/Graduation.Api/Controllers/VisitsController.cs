using System.Security.Claims;
using Graduation.Api.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/visits"),Authorize(Roles="ADMIN,RECEPTIONIST,DOCTOR")]
public sealed class VisitsController(VisitRepository visits,ArchiveDeleteRepository archive):ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery]long? patientId,[FromQuery]int page=1,[FromQuery]int size=20,CancellationToken ct=default)
    {
        if(page<1||size<1||size>100) return BadRequest("Phân trang không hợp lệ.");
        return Ok(await visits.ListAsync(patientId,page,size,DoctorScope(),ct));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id,CancellationToken ct)
    {
        var visit=await visits.GetAsync(id,DoctorScope(),ct);
        return visit is null?NotFound():Ok(visit);
    }

    [HttpPost,Authorize(Roles="ADMIN,RECEPTIONIST")]
    public async Task<IActionResult> Create(VisitInput input,CancellationToken ct)
    {
        var errors=InputValidation.Visit(input);
        if(errors.Count>0) return ValidationProblem(new ValidationProblemDetails(errors));
        var id=await visits.CreateAsync(input,ct);
        return CreatedAtAction(nameof(Get),new {id},await visits.GetAsync(id,null,ct));
    }

    [HttpDelete("{id:long}"),Authorize(Roles="ADMIN")]
    public async Task<IActionResult> Delete(long id,[FromQuery]string reason,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(reason)||reason.Length>500) return BadRequest("Cần lý do xóa.");
        var actor=User.FindFirstValue(ClaimTypes.NameIdentifier)??"unknown";
        var result=await archive.DeleteAsync("Visits",id,actor,reason,ct,"REGISTERED");
        return result is null ? Conflict("Chỉ xóa lượt chưa bắt đầu; lượt đã điều trị phải kết thúc theo quy trình.")
            : result.Value ? NoContent() : NotFound();
    }

    private long? DoctorScope() => User.IsInRole("DOCTOR") && !User.IsInRole("ADMIN") && !User.IsInRole("RECEPTIONIST")
        ? long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!) : null;
}
