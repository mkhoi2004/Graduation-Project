param([string]$Server = '.\SQLEXPRESS')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = Join-Path $projectRoot 'database'
$testName = 'GraduationProject_FoundationTest_' + [guid]::NewGuid().ToString('N')
# Fresh random identifier generated here; never accept a target database from user input.
if ($testName -notmatch '^GraduationProject_FoundationTest_[a-f0-9]{32}$') { throw 'Unsafe test database identifier' }
$sqlPath = Join-Path ([IO.Path]::GetTempPath()) ($testName + '.sql')
$created = $false
try {
  & sqlcmd -S $Server -E -C -b -l 8 -Q "IF DB_ID(N'$testName') IS NOT NULL THROW 51100, 'Test database collision', 1; CREATE DATABASE [$testName];"
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create isolated test database' }
  $created = $true
  $files = @(
    '02_tables/02_m01_foundation.sql', '02_tables/02_m02_catalog.sql', '02_tables/02_m03_patient_visit.sql',
    '02_tables/02_m05_clinical.sql', '02_tables/02_m06_billing.sql', '02_tables/02_m07_inventory.sql',
    '02_tables/02_m08_accounting.sql', '02_tables/02_m09_insurance.sql', '02_tables/02_m10_operations.sql',
    '02_tables/02_m11_hr.sql', '02_tables/02_m12_reconciliation.sql',
    '03_deleted_tables/03_m01_foundation.sql', '03_deleted_tables/03_m02_m12_archives.sql',
    '04_triggers/04_m01_foundation.sql', '04_triggers/04_m02_m12_guards.sql',
    '05_constraints_indexes.sql'
  )
  $parts = @("USE [$testName];", 'SET XACT_ABORT ON; SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET QUOTED_IDENTIFIER ON; SET NUMERIC_ROUNDABORT OFF; BEGIN TRANSACTION;')
  foreach ($file in $files) { $parts += Get-Content -Raw -Encoding UTF8 (Join-Path $databaseRoot $file) }
  $parts += "INSERT dbo.SchemaMigrations(MigrationId) VALUES ('001-full-schema'); COMMIT TRANSACTION;"
  $parts += Get-Content -Raw -Encoding UTF8 (Join-Path $databaseRoot 'verify.sql')
  $parts += Get-Content -Raw -Encoding UTF8 (Join-Path $databaseRoot 'tests/foundation-smoke.sql')
  [IO.File]::WriteAllText($sqlPath, ($parts -join "`n"), [Text.UTF8Encoding]::new($true))
  & sqlcmd -S $Server -E -C -b -l 8 -i $sqlPath
  if ($LASTEXITCODE -ne 0) { throw 'SQL foundation smoke failed' }
  $seedPath = Join-Path $databaseRoot '06_seed.sql'
  & sqlcmd -S $Server -E -C -b -l 8 -d $testName -i $seedPath
  if ($LASTEXITCODE -ne 0) { throw 'SQL seed failed' }
  & sqlcmd -S $Server -E -C -b -l 8 -d $testName -i $seedPath
  if ($LASTEXITCODE -ne 0) { throw 'SQL seed rerun failed' }
  & sqlcmd -S $Server -E -C -b -l 8 -d $testName -Q "SET NOCOUNT ON; IF (SELECT COUNT(*) FROM dbo.Roles)<>5 THROW 51101,'Expected five roles',1; IF (SELECT COUNT(*) FROM dbo.Users)<>6 THROW 51102,'Expected six users',1; IF (SELECT COUNT(*) FROM dbo.SystemConfigVersions)<>2 THROW 51103,'Seed is not idempotent',1; PRINT 'Seed idempotency verified.';"
  if ($LASTEXITCODE -ne 0) { throw 'SQL seed verification failed' }
} finally {
  if ($created) {
    # Drop only the fresh database whose creation succeeded in this invocation.
    & sqlcmd -S $Server -E -C -b -l 8 -Q "IF DB_ID(N'$testName') IS NOT NULL BEGIN ALTER DATABASE [$testName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$testName]; END;"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Cleanup failed for $testName" }
  }
  if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath }
}
