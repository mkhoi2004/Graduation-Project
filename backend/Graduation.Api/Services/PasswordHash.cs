using System.Globalization;
using System.Security.Cryptography;

namespace Graduation.Api.Services;

public static class PasswordHash
{
    private const int Iterations = 210_000;

    public static bool IsValid(string? password) =>
        password is { Length: > 8 } && password.Any(character => char.IsPunctuation(character) || char.IsSymbol(character));

    public static string Create(string password)
    {
        if (!IsValid(password))
            throw new ArgumentException("Mật khẩu phải có hơn 8 ký tự và ít nhất một ký tự đặc biệt.", nameof(password));
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, 32);
        return $"pbkdf2-sha256${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string encoded)
    {
        try
        {
            var parts = encoded.Split('$');
            if (parts.Length != 4 || parts[0] != "pbkdf2-sha256") return false;
            var iterations = int.Parse(parts[1], CultureInfo.InvariantCulture);
            if (iterations < 100_000 || iterations > 2_000_000) return false;
            var salt = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            if (salt.Length != 16 || expected.Length != 32) return false;
            var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException) { return false; }
        catch (OverflowException) { return false; }
    }
}
