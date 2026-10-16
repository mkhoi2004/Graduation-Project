import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './env.validation.js';

describe('validateEnvironment', () => {
  it('transforms a valid API port into a number', () => {
    const environment = validateEnvironment({
      DATABASE_URL:
        'sqlserver://DESKTOP-F5CFA0D:1433;database=Graduation-Project;integratedSecurity=true;trustServerCertificate=true;schema=dbo',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      API_PORT: '3100',
      FRONTEND_URL: 'http://localhost:5173',
    });

    expect(environment.API_PORT).toBe(3100);
  });

  it('rejects configuration without a database URL', () => {
    expect(() =>
      validateEnvironment({
        API_PORT: '3000',
        FRONTEND_URL: 'http://localhost:5173',
        JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-SQL Server database URL', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost:5432/dental_erp',
        API_PORT: '3000',
        FRONTEND_URL: 'http://localhost:5173',
        JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a short JWT signing secret', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL:
          'sqlserver://DESKTOP-F5CFA0D:1433;database=Graduation-Project;integratedSecurity=true;trustServerCertificate=true;schema=dbo',
        JWT_SECRET: 'too-short',
        API_PORT: '3000',
        FRONTEND_URL: 'http://localhost:5173',
      }),
    ).toThrow(/JWT_SECRET/);
  });
});
