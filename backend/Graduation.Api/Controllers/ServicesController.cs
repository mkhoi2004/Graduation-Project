using System.Security.Claims;
using Graduation.Api.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/services"),Authorize]
public sealed class ServicesController(ServiceRepository services,ArchiveDeleteRepository archive):ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery]string? search,[FromQuery]int page=1,[FromQuery]int size=20,CancellationToken ct=default)
    {
        if(page<1||size<1||size>100) return BadRequest("Phân trang không hợp lệ.");
        return Ok(await services.ListAsync(search,page,size,ct));
    }

    [HttpPost,Authorize(Roles="ADMIN")]
    public async Task<IActionResult> Create(ServiceInput input,CancellationToken ct)
    {
        var errors=InputValidation.Service(input);
        if(errors.Count>0) return ValidationProblem(new ValidationProblemDetails(errors));
        var id=await services.CreateAsync(input,ct);
        return Created($"/api/services/{id}",new {id});
    }

    [HttpDelete("{id:long}"),Authorize(Roles="ADMIN")]
    public async Task<IActionResult> Delete(long id,[FromQuery]string reason,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(reason)||reason.Length>500) return BadRequest("Cần lý do xóa.");
        var actor=User.FindFirstValue(ClaimTypes.NameIdentifier)??"unknown";
        return await archive.DeleteAsync("Services",id,actor,reason,ct)==true?NoContent():NotFound();
    }
}
