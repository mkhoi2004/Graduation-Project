using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Graduation.Api.Data;
using Microsoft.IdentityModel.Tokens;

namespace Graduation.Api.Services;

public sealed class JwtTokenService(IConfiguration configuration)
{
    public string Create(AuthUser user)
    {
        var key=configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is required.");
        var claims=new List<Claim>
        {
            new(ClaimTypes.NameIdentifier,user.Id.ToString()),
            new(ClaimTypes.Name,user.Username),
            new(JwtRegisteredClaimNames.Jti,Guid.NewGuid().ToString())
        };
        claims.AddRange(user.Roles.Select(role=>new Claim(ClaimTypes.Role,role)));
        var token=new JwtSecurityToken(configuration["Jwt:Issuer"],configuration["Jwt:Audience"],claims,
            expires:DateTime.UtcNow.AddMinutes(30),
            signingCredentials:new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
