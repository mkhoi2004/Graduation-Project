using System.Data;
using Microsoft.Data.SqlClient;

namespace Graduation.Api.Data;

public static class SqlParameters
{
    public static SqlParameter Add(SqlCommand command, string name, SqlDbType type, object? value, int size = 0)
    {
        var parameter = size != 0 ? command.Parameters.Add(name, type, size) : command.Parameters.Add(name, type);
        parameter.Value = value ?? DBNull.Value;
        return parameter;
    }
}
