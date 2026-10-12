using Graduation.Api.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/users"),Authorize(Roles="ADMIN")]
public sealed class UsersController(AuthRepository repository):ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)=>Ok(await repository.ListUsersAsync(ct));

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserInput input,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(input.Username)||input.Username.Length>100||input.Username.Length<3||
           string.IsNullOrWhiteSpace(input.DisplayName)||input.DisplayName.Length>150||
           !PasswordHash.IsValid(input.Password)||input.Roles is null||input.Roles.Length==0)
            return BadRequest("Tên, mật khẩu hơn 8 ký tự có ký tự đặc biệt và vai trò hợp lệ là bắt buộc.");
        var id=await repository.CreateUserAsync(input,ct);
        return Created($"/api/users/{id}",new {id});
    }

    [HttpGet("roles")]
    public async Task<IActionResult> Roles(CancellationToken ct)=>Ok(await repository.ListRolesAsync(ct));

    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole(RoleInput input,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(input.Code)||input.Code.Length>40||string.IsNullOrWhiteSpace(input.Name)||input.Name.Length>120)
            return BadRequest("Mã/tên vai trò không hợp lệ.");
        var id=await repository.CreateRoleAsync(input.Code.Trim(),input.Name.Trim(),ct);
        return Created($"/api/users/roles/{id}",new {id});
    }
}

public sealed record RoleInput(string Code,string Name);
