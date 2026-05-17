# =============================================================================
# Crea los issues definidos en seed-github-issues-data.ps1.
# Idempotente: si un issue con el mismo titulo ya existe, lo omite.
# Tras crearlos, cierra los que tienen status="done".
# =============================================================================

$ErrorActionPreference = 'Stop'
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:GH_TOKEN = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "arodovi852/AROProyectoFinDeGrado2026"

. "$PSScriptRoot\seed-github-issues-data.ps1"

# Listar issues ya existentes (open + closed) para evitar duplicados
Write-Host "==> Listando issues existentes..." -ForegroundColor Cyan
$existingJson = & $gh issue list --repo $repo --state all --limit 500 --json number,title,state 2>$null
$existing = @()
if ($existingJson) { $existing = @($existingJson | ConvertFrom-Json) }
$existingByTitle = @{}
foreach ($e in $existing) {
    if ($null -ne $e -and $null -ne $e.title) {
        $existingByTitle[$e.title] = $e
    }
}
Write-Host "  Encontrados $($existing.Count) issues ya existentes."

# Crear issues uno a uno
$created = @()
$skipped = 0

foreach ($issue in $Global:Issues) {
    if ($existingByTitle.ContainsKey($issue.title)) {
        Write-Host "  - omitido (ya existe): $($issue.title)" -ForegroundColor DarkGray
        $created += [PSCustomObject]@{ number = $existingByTitle[$issue.title].number; title = $issue.title; status = $issue.status }
        $skipped++
        continue
    }

    $bodyFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($bodyFile, $issue.body)

    # 1) Crear el issue SIN labels (gh tiene un bug con --label)
    $resp = & $gh issue create --repo $repo --title $issue.title --body-file $bodyFile --milestone $issue.milestone 2>&1
    Remove-Item $bodyFile -Force

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ! ERROR creando '$($issue.title)':" -ForegroundColor Red
        Write-Host "    $resp" -ForegroundColor Red
        continue
    }

    # El output incluye la URL del issue: extraemos el numero
    $urlLine = $resp | Where-Object { $_ -match '/issues/\d+$' } | Select-Object -Last 1
    if (-not $urlLine) { $urlLine = $resp | Select-Object -Last 1 }
    $num = if ("$urlLine" -match '/issues/(\d+)') { [int]$matches[1] } else { 0 }

    # 2) Aplicar labels via issue edit
    if ($num -gt 0 -and $issue.labels.Count -gt 0) {
        $labelArgs = @("issue", "edit", "$num", "--repo", $repo)
        foreach ($lbl in $issue.labels) { $labelArgs += @("--add-label", $lbl) }
        & $gh @labelArgs 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ! warning: no se pudieron aplicar labels al #$num" -ForegroundColor Yellow
        }
    }

    Write-Host "  + creado #$num : $($issue.title)" -ForegroundColor Green
    $created += [PSCustomObject]@{ number = $num; title = $issue.title; status = $issue.status }
}

Write-Host "`n==> Creados $($created.Count - $skipped) nuevos, omitidos $skipped ya existentes." -ForegroundColor Cyan

# Guardar mapeo para el siguiente paso (project + cierre)
$created | ConvertTo-Json | Set-Content "$PSScriptRoot\issues-map.json" -Encoding UTF8

# Cerrar issues marcados como done
Write-Host "`n==> Cerrando issues completados..." -ForegroundColor Cyan
$toClose = $created | Where-Object { $_.status -eq "done" -and $_.number -gt 0 }
foreach ($i in $toClose) {
    # Comprobamos estado actual antes de cerrar
    $state = ($existingByTitle[$i.title]).state
    if ($state -eq "CLOSED") {
        Write-Host "  - ya cerrado #$($i.number)" -ForegroundColor DarkGray
        continue
    }
    $null = & $gh issue close $i.number --repo $repo --reason completed 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  x cerrado #$($i.number)" -ForegroundColor Yellow
    } else {
        Write-Host "  ! no se pudo cerrar #$($i.number)" -ForegroundColor Red
    }
}

Write-Host "`n==> Hecho." -ForegroundColor Cyan
