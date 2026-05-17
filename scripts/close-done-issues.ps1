# Cierra todos los issues marcados como "done" en seed-github-issues-data.ps1

$ErrorActionPreference = 'Continue'
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:GH_TOKEN = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "arodovi852/AROProyectoFinDeGrado2026"

. "$PSScriptRoot\seed-github-issues-data.ps1"

# Mapear titulo -> numero a partir de los issues actuales
$issuesJson = & $gh issue list --repo $repo --state all --limit 500 --json number,title,state 2>$null
$current = @($issuesJson | ConvertFrom-Json)
$byTitle = @{}
foreach ($i in $current) {
    if ($null -ne $i -and $null -ne $i.title) {
        $byTitle[$i.title] = $i
    }
}

$doneIssues = $Global:Issues | Where-Object { $_.status -eq "done" }
Write-Host "Cerrando $($doneIssues.Count) issues completados..."
Write-Host ""

foreach ($issue in $doneIssues) {
    if (-not $byTitle.ContainsKey($issue.title)) {
        Write-Host "  ? no encontrado: $($issue.title)" -ForegroundColor Yellow
        continue
    }
    $i = $byTitle[$issue.title]
    if ($i.state -eq "CLOSED") {
        Write-Host "  - ya cerrado #$($i.number)" -ForegroundColor DarkGray
        continue
    }
    $null = & $gh issue close $i.number --repo $repo --reason completed 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  x cerrado #$($i.number) : $($issue.title)" -ForegroundColor Yellow
    } else {
        Write-Host "  ! fallo #$($i.number)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==> Hecho." -ForegroundColor Cyan
