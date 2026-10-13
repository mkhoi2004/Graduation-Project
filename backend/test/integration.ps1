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
    $random = [Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($keyBytes)
    $random.Dispose()
    $env:JWT_KEY = [Convert]::ToBase64String($keyBytes)
    $env:SEED_LOCAL_ACCOUNTS = 'true'
    $env:SQL_SERVER = $server
    $env:SQL_DATABASE = $dbName
    $env:NODE_ENV = 'development'
    $env:PORT = '5097'

    $outLog = Join-Path $tempScripts 'api-out.log'
    $errLog = Join-Path $tempScripts 'api-err.log'
    $apiProcess = Start-Process -FilePath 'node' -ArgumentList @(
        (Join-Path $projectRoot 'backend\dist\main.js')) `
        -WorkingDirectory (Join-Path $projectRoot 'backend') -WindowStyle Hidden -PassThru `
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

    $tokens = @{}
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
            $tokens[$account.username] = $signedIn.token
    }
    Write-Output 'PASS: three local accounts can log in with their roles'
    $headers = @{ Authorization = "Bearer $($tokens.admin)" }
    $doctorHeaders = @{ Authorization = "Bearer $($tokens.doctor)" }
    $receptionHeaders = @{ Authorization = "Bearer $($tokens.receptionist)" }
    $users = Invoke-RestMethod -Uri "$baseUrl/api/users" -Headers $headers
    $doctorId = ($users | Where-Object { $_.username -eq 'doctor' } | Select-Object -First 1).id
    if (-not $doctorId) { throw 'Doctor account missing' }

    $serviceBody = @{ code = 'INTEGRATION'; name = 'Dịch vụ thử'; requiresConsent = $false } | ConvertTo-Json
    $service = Invoke-RestMethod -Uri "$baseUrl/api/services" -Method Post -Headers $headers -ContentType 'application/json' -Body $serviceBody
    if ($service.id -le 0) { throw 'Service create failed' }
    $serviceList = Invoke-RestMethod -Uri "$baseUrl/api/services" -Headers $receptionHeaders
    if (-not ($serviceList | Where-Object id -eq $service.id)) { throw 'Service list failed' }
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/services" -Method Post -Headers $doctorHeaders -ContentType 'application/json' -Body $serviceBody | Out-Null
        throw 'Doctor created a service'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 403) { throw }
    }

    $patientBody = @{ fullName = 'Integration Test'; birthYear = 1990; dateOfBirth = '1990-01-02'; phone = '0900000000' } | ConvertTo-Json
    $patient = Invoke-RestMethod -Uri "$baseUrl/api/patients" -Method Post -Headers $headers -ContentType 'application/json' -Body $patientBody
    if ($patient.id -le 0 -or $patient.version -ne 1 -or $patient.dateOfBirth -ne '1990-01-02') { throw 'Patient create/date failed' }
    $id = [long]$patient.id
    $visitBody = @{ patientId = $id; doctorUserId = [long]$doctorId; branchCode = 'HN'; visitType = 'STANDARD' } | ConvertTo-Json
    $visit = Invoke-RestMethod -Uri "$baseUrl/api/visits" -Method Post -Headers $headers -ContentType 'application/json' -Body $visitBody
    if ($visit.patientId -ne $id -or $visit.doctorUserId -ne $doctorId) { throw 'Visit create failed' }
    $doctorPatients = Invoke-RestMethod -Uri "$baseUrl/api/patients" -Headers $doctorHeaders
    if (-not ($doctorPatients | Where-Object id -eq $id)) { throw 'Doctor cannot see assigned patient' }
    $updateBody = @{ fullName = 'Integration Updated'; birthYear = 1990; dateOfBirth = $null; phone = '0900000001'; version = 1 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/patients/$id" -Method Put -Headers $headers -ContentType 'application/json' -Body $updateBody | Out-Null
    $updated = Invoke-RestMethod -Uri "$baseUrl/api/patients/$id" -Headers $headers
    if ($updated.version -ne 2 -or $updated.fullName -ne 'Integration Updated') { throw 'Patient update failed' }
    if ($updated.PSObject.Properties.Name -contains 'medicalHistory') { throw 'Clinical history leaked in administrative API' }
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/patients/$id" -Method Put -Headers $headers -ContentType 'application/json' -Body $updateBody | Out-Null
        throw 'Stale patient version was accepted'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 409) { throw }
    }
    $badUser = @{ username = 'badrole'; displayName = 'Bad Role'; password = 'Admin1234@'; roles = @('NO_SUCH_ROLE') } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/users" -Method Post -Headers $headers -ContentType 'application/json' -Body $badUser | Out-Null
        throw 'Unknown role was accepted'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 400) { throw }
    }
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/patients/$id`?reason=blocked-by-visit" -Method Delete -Headers $headers | Out-Null
        throw 'Patient with a live visit was deleted'
    } catch {
        if ([int]$_.Exception.Response.StatusCode -ne 409) { throw }
    }
    Invoke-RestMethod -Uri "$baseUrl/api/visits/$($visit.id)?reason=integration-test" -Method Delete -Headers $headers | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/api/patients/$id`?reason=integration-test" -Method Delete -Headers $headers | Out-Null
    Invoke-RestMethod -Uri "$baseUrl/api/services/$($service.id)?reason=integration-test" -Method Delete -Headers $headers | Out-Null

    $checks = @"
SET NOCOUNT ON;
IF EXISTS(SELECT 1 FROM dbo.Patients WHERE Id=$id) THROW 51301,'Deleted patient remains live',1;
IF (SELECT COUNT(*) FROM dbo.Patients_Deleted WHERE Id=$id AND DeletedBy=CONVERT(NVARCHAR(128),(SELECT Id FROM dbo.Users WHERE Username='admin')))<>1 THROW 51302,'Archive missing actor or duplicate',1;
IF (SELECT COUNT(*) FROM dbo.AuditLogs WHERE EntityName='Patients' AND EntityId=$id AND Action IN ('CREATE','READ','UPDATE','DELETE'))<4 THROW 51303,'Patient audit events missing',1;
IF EXISTS(SELECT 1 FROM dbo.Users WHERE Username='badrole') THROW 51304,'Failed user transaction was not rolled back',1;
IF (SELECT COUNT(*) FROM dbo.Visits_Deleted WHERE Id=$($visit.id))<>1 THROW 51305,'Visit archive missing',1;
IF (SELECT COUNT(*) FROM dbo.Services_Deleted WHERE Id=$($service.id))<>1 THROW 51306,'Service archive missing',1;
PRINT 'PASS: API login, patient CRUD, archive and audit';
"@
    & sqlcmd -S $server -d $dbName -E -b -Q $checks
    if ($LASTEXITCODE -ne 0) { throw 'SQL verification failed' }
}
catch {
    if (Test-Path -LiteralPath $outLog) { Get-Content -LiteralPath $outLog -Tail 30 }
    if (Test-Path -LiteralPath $errLog) { Get-Content -LiteralPath $errLog -Tail 30 }
    throw
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
    Remove-Item Env:JWT_KEY, Env:SEED_LOCAL_ACCOUNTS, Env:SQL_SERVER, Env:SQL_DATABASE, Env:NODE_ENV, Env:PORT -ErrorAction SilentlyContinue
}
