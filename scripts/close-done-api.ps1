# Cierra todos los issues "done" via API REST directa.

$ErrorActionPreference = 'Continue'
$token = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$repo = "arodovi852/AROProyectoFinDeGrado2026"
$headers = @{ Authorization = "token $token"; "User-Agent" = "ps-script"; Accept = "application/vnd.github+json" }

. "$PSScriptRoot\seed-github-issues-data.ps1"

# Construir set de titulos "done"
$doneTitles = New-Object System.Collections.Generic.HashSet[string]
foreach ($issue in $Global:Issues) {
    if ($issue.status -eq "done") {
        $null = $doneTitles.Add($issue.title)
    }
}
Write-Host "Titulos done: $($doneTitles.Count)"

# Listar issues abiertos paginados via API
$openIssues = @()
$page = 1
while ($true) {
    $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/issues?state=open&per_page=100&page=$page" -Headers $headers
    if (-not $resp -or $resp.Count -eq 0) { break }
    $openIssues += $resp
    if ($resp.Count -lt 100) { break }
    $page++
}
Write-Host "Issues abiertos en GitHub: $($openIssues.Count)"
Write-Host ""

$closed = 0
foreach ($i in $openIssues) {
    if ($doneTitles.Contains($i.title)) {
        $body = '{"state":"closed","state_reason":"completed"}'
        try {
            Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/$repo/issues/$($i.number)" -Headers $headers -Body $body -ContentType "application/json" | Out-Null
            Write-Host "  x cerrado #$($i.number) : $($i.title)" -ForegroundColor Yellow
            $closed++
        } catch {
            Write-Host "  ! fallo #$($i.number): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "==> Cerrados $closed issues." -ForegroundColor Cyan
