using Graduation.Api.Data;
using Graduation.Api.Models;
using Graduation.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Graduation.Api.Controllers;

[ApiController,Route("api/auth")]
public sealed class AuthController(AuthRepository repository,JwtTokenService tokens):ControllerBase
{
    [HttpPost("login"),AllowAnonymous,EnableRateLimiting("login")]
    public async Task<ActionResult<LoginResult>> Login(LoginInput input,CancellationToken ct)
    {
        if(string.IsNullOrWhiteSpace(input.Username)||string.IsNullOrEmpty(input.Password)) return BadRequest();
        var user=await repository.FindAsync(input.Username.Trim(),ct);
        if(user is null || !PasswordHash.Verify(input.Password,user.PasswordHash)) return Unauthorized();
        return new LoginResult(tokens.Create(user),user.Username,user.Roles);
    }

    [HttpGet("me"),Authorize]
    public IActionResult Me()=>Ok(new {username=User.Identity?.Name,roles=User.Claims.Where(c=>c.Type==System.Security.Claims.ClaimTypes.Role).Select(c=>c.Value)});
}
