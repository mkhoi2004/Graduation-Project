import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  MinLength,
  NotEquals,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsNotEmpty()
  @Matches(/^sqlserver:\/\//, {
    message: 'DATABASE_URL must use the sqlserver:// protocol',
  })
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  @NotEquals('replace-with-a-long-random-secret-before-production')
  JWT_SECRET!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_535)
  API_PORT = 3000;

  @IsUrl({ require_tld: false })
  FRONTEND_URL = 'http://localhost:5173';
}

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables & Record<string, unknown> {
  const environment = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(environment, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.toString()}`);
  }

  return Object.assign({}, config, {
    DATABASE_URL: environment.DATABASE_URL,
    JWT_SECRET: environment.JWT_SECRET,
    API_PORT: environment.API_PORT,
    FRONTEND_URL: environment.FRONTEND_URL,
  });
}
