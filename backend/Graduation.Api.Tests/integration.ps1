param([switch]$SeedLocal)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$dbName = 'GraduationProject_IT_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$server = '.\SQLEXPRESS'
$tempScripts = Join-Path ([IO.Path]::GetTempPath()) $dbName
$apiProcess = $null
$createdDb = $false

try {
    New-Item -ItemType Directory -Path $tempScripts | Out-Null
    foreach ($script in @('001_schema.sql', '002_archive.sql', '003_hardening.sql')) {
        $source = Join-Path $projectRoot ('database\' + $script)
        $target = Join-Path $tempScripts $script
        (Get-Content -LiteralPath $source -Raw).Replace('Graduation Project', $dbName) |
            Set-Content -LiteralPath $target -Encoding utf8
        & sqlcmd -S $server -E -b -i $target
        if ($LASTEXITCODE -ne 0) { throw "SQL setup failed: $script" }
        $createdDb = $true
    }

    $keyBytes = [byte[]]::new(48)
    $passwordBytes = [byte[]]::new(32)
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($keyBytes)
    $random.GetBytes($passwordBytes)
    $random.Dispose()
    $env:Jwt__Key = [Convert]::ToBase64String($keyBytes)
    if ($SeedLocal) {
        $env:Bootstrap__SeedLocalAccounts = 'true'
        Remove-Item Env:Bootstrap__AdminPassword -ErrorAction SilentlyContinue
    } else {
        $env:Bootstrap__SeedLocalAccounts = 'false'
        $env:Bootstrap__AdminPassword = [Convert]::ToBase64String($passwordBytes)
    }
    $env:ConnectionStrings__Default = "Server=$server;Database=$dbName;Integrated Security=True;Encrypt=True;TrustServerCertificate=True"
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:ASPNETCORE_URLS = 'http://127.0.0.1:5097'
    $env:DOTNET_CLI_HOME = $projectRoot
    $env:NUGET_PACKAGES = Join-Path $projectRoot '.nuget\packages'

    $outLog = Join-Path $tempScripts 'api-out.log'
    $errLog = Join-Path $tempScripts 'api-err.log'
    $apiProcess = Start-Process -FilePath 'dotnet' -ArgumentList @(
        'run', '--no-build', '--no-launch-profile', '--project',
        (Join-Path $projectRoot 'backend\Graduation.Api\Graduation.Api.csproj')) `
        -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $outLog -RedirectStandardError $errLog
    $baseUrl = 'http://127.0.0.1:5097'
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        try {
            $result = Invoke-RestMethod -Uri "$baseUrl/health/ready" -TimeoutSec 2
            if ($result.status -eq 'ready') { $ready = $true; break }
        } catch { }
    }
    if (-not $ready) {
        if (Test-Path -LiteralPath $outLog) { Get-Content -LiteralPath $outLog -Tail 15 }
        if (Test-Path -LiteralPath $errLog) { Get-Content -LiteralPath $errLog -Tail 15 }
        throw 'API did not become ready'
    }

    if ($SeedLocal) {
        foreach ($account in @(
            @{ username = 'admin'; password = 'Admin1234@'; role = 'ADMIN' },
            @{ username = 'receptionist'; password = 'Reception1234@'; role = 'RECEPTIONIST' },
            @{ username = 'doctor'; password = 'Doctor1234@'; role = 'DOCTOR' }
        )) {
            $body = @{ username = $account.username; password = $account.password } | ConvertTo-Json
            $signedIn = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $body
            if (-not $signedIn.token -or -not ($signedIn.roles -contains $account.role)) {
                throw "Local account login or role failed: $($account.username)"
            }
        }
        Write-Output 'PASS: three local accounts can log in with their roles'
    }
    $adminPassword = if ($SeedLocal) { 'Admin1234@' } else { $env:Bootstrap__AdminPassword }
    $loginBody = @{ username = 'admin'; password = $adminPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
    if (-not $login.token -or -not ($login.roles -contains 'ADMIN')) { throw 'Admin login failed' }
    $headers = @{ Authorization = "Bearer $($login.token)" }

    $patientBody = @{ fullName = 'Integration Test'; birthYear = 1990; dateOfBirth = $null; phone = '0900000000' } | ConvertTo-Json
    $patient = Invoke-RestMethod -Uri "$baseUrl/api/patients" -Method Post -Headers $headers -ContentType 'application/json' -Body $patientBody
    if ($patient.id -le 0 -or $patient.version -ne 1) { throw 'Patient create failed' }
    $id = [long]$patient.id
    $updateBody = @{ fullName = 'Integration Updated'; birthYear = 1990; dateOfBirth = $null; phone = '0900000001'; version = 1 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/patients/$id" -Method Put -Headers $headers -ContentType 'application/json' -Body $updateBody | Out-Null
    $updated = Invoke-RestMethod -Uri "$baseUrl/api/patients/$id" -Headers $headers
    if ($updated.version -ne 2 -or $updated.fullName -ne 'Integration Updated') { throw 'Patient update failed' }
    if ($updated.PSObject.Properties.Name -contains 'medicalHistory') { throw 'Clinical history leaked in administrative API' }
    Invoke-RestMethod -Uri "$baseUrl/api/patients/$id`?reason=integration-test" -Method Delete -Headers $headers | Out-Null

    $checks = @"
SET NOCOUNT ON;
IF EXISTS(SELECT 1 FROM dbo.Patients WHERE Id=$id) THROW 51301,'Deleted patient remains live',1;
IF (SELECT COUNT(*) FROM dbo.Patients_Deleted WHERE Id=$id AND DeletedBy=CONVERT(NVARCHAR(128),(SELECT Id FROM dbo.Users WHERE Username='admin')))<>1 THROW 51302,'Archive missing actor or duplicate',1;
IF (SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityName='Patients' AND EntityId=$id AND Action IN ('CREATE','READ','UPDATE','DELETE'))<4 THROW 51303,'Patient audit events missing',1;
PRINT 'PASS: API login, patient CRUD, archive and audit';
"@
    & sqlcmd -S $server -d $dbName -E -b -Q $checks
    if ($LASTEXITCODE -ne 0) { throw 'SQL verification failed' }
}
finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        & taskkill.exe /PID $apiProcess.Id /T /F | Out-Null
        $apiProcess.WaitForExit()
    }
    if ($createdDb -and $dbName.StartsWith('GraduationProject_IT_', [StringComparison]::Ordinal)) {
        & sqlcmd -S $server -d master -E -b -Q "ALTER DATABASE [$dbName] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$dbName];"
    }
    if (Test-Path -LiteralPath $tempScripts) {
        $resolved = (Resolve-Path -LiteralPath $tempScripts).Path
        $tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
        if (-not $resolved.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or
            -not (Split-Path -Leaf $resolved).StartsWith('GraduationProject_IT_', [StringComparison]::Ordinal)) {
            throw 'Unsafe temporary cleanup target'
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
    Remove-Item Env:Jwt__Key, Env:Bootstrap__AdminPassword, Env:Bootstrap__SeedLocalAccounts, Env:ConnectionStrings__Default -ErrorAction SilentlyContinue
}
