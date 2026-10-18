import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      DATABASE_URL:
        'sqlserver://DESKTOP-F5CFA0D:1433;database=Graduation-Project;integratedSecurity=true;trustServerCertificate=true;schema=dbo',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      API_PORT: '3000',
      FRONTEND_URL: 'http://localhost:5173',
    },
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
