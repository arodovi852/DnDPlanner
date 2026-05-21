# =============================================================================
# Crea labels, milestones e issues en arodovi852/DnDPlanner
# que reflejan la planificacion completa del PFG.
#
# Requisitos:
#   - GitHub CLI instalado en "C:\Program Files\GitHub CLI\gh.exe"
#   - Token en C:\Users\rodri\.gh_token con scopes repo, project, workflow
#
# Idempotente: comprueba lo existente antes de crear nada.
# =============================================================================

$ErrorActionPreference = 'Stop'
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:GH_TOKEN = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "arodovi852/DnDPlanner"

function Invoke-Gh {
    param([string[]]$Args)
    & $gh @Args
    if ($LASTEXITCODE -ne 0) { throw "gh failed: $($Args -join ' ')" }
}

# -----------------------------------------------------------------------------
# 1) LABELS
# -----------------------------------------------------------------------------
Write-Host "==> Creando labels..." -ForegroundColor Cyan

$labels = @(
    @{ name = "tipo-feature";        color = "1f883d"; desc = "Nueva funcionalidad" },
    @{ name = "tipo-bug";            color = "d73a4a"; desc = "Fallo a corregir" },
    @{ name = "tipo-chore";          color = "c5def5"; desc = "Tarea de mantenimiento" },
    @{ name = "tipo-docs";           color = "0075ca"; desc = "Documentacion" },
    @{ name = "tipo-refactor";       color = "a371f7"; desc = "Refactorizacion sin cambio funcional" },
    @{ name = "tipo-infra";          color = "5319e7"; desc = "Infraestructura, CI/CD, despliegue" },

    @{ name = "area-frontend";       color = "61dafb"; desc = "React, Vite, SCSS" },
    @{ name = "area-backend";        color = "3c873a"; desc = "Express, Mongoose, Socket.IO" },
    @{ name = "area-bbdd";           color = "13aa52"; desc = "MongoDB, esquemas, migraciones" },
    @{ name = "area-ui-ux";          color = "f9d0c4"; desc = "Diseno visual y experiencia" },
    @{ name = "area-auth";           color = "fbca04"; desc = "Autenticacion y autorizacion" },
    @{ name = "area-tiempo-real";    color = "0e8a16"; desc = "Socket.IO, sincronizacion" },
    @{ name = "area-despliegue";     color = "8b008b"; desc = "Docker, nginx, DigitalOcean" },
    @{ name = "area-i18n";           color = "ffcc99"; desc = "Internacionalizacion ES/EN" },

    @{ name = "prioridad-alta";      color = "b60205"; desc = "Bloquea otras tareas o es critica" },
    @{ name = "prioridad-media";     color = "fbca04"; desc = "Importante pero no bloqueante" },
    @{ name = "prioridad-baja";      color = "0e8a16"; desc = "Mejora deseable" }
)

$labelJson = & $gh label list --repo $repo --limit 200 --json name 2>$null
$existing = ($labelJson | ConvertFrom-Json).name
if ($null -eq $existing) { $existing = @() }

foreach ($l in $labels) {
    if ($existing -contains $l.name) {
        Write-Host "  - ya existe: $($l.name)" -ForegroundColor DarkGray
    } else {
        Invoke-Gh @("label", "create", $l.name, "--repo", $repo, "--color", $l.color, "--description", $l.desc) | Out-Null
        Write-Host "  + creado: $($l.name)" -ForegroundColor Green
    }
}

# -----------------------------------------------------------------------------
# 2) MILESTONES (via API REST porque gh no expone milestones directamente)
# -----------------------------------------------------------------------------
Write-Host "`n==> Creando milestones..." -ForegroundColor Cyan

$milestones = @(
    @{ title = "M1 - Cimientos y backend";   due = "2026-03-31T23:59:59Z"; desc = "Setup inicial, backend completo, modelos de datos, autenticacion JWT." },
    @{ title = "M2 - Frontend base y maqueta";  due = "2026-04-15T23:59:59Z"; desc = "Componentes principales, paginas provisionales, header/footer, configuracion de rutas y estilos." },
    @{ title = "M3 - Modulos funcionales";      due = "2026-04-30T23:59:59Z"; desc = "Autenticacion en cliente, mapa, campanas, capitulos, personajes, perfiles sociales, anotaciones." },
    @{ title = "M4 - Pulido y despliegue";      due = "2026-05-15T23:59:59Z"; desc = "Tiempo real, ajustes finales de diseno, responsive movil, despliegue en DigitalOcean." },
    @{ title = "Backlog futuro";                due = $null;                  desc = "Mejoras propuestas para versiones posteriores." }
)

$msJson = & $gh api "repos/$repo/milestones?state=all&per_page=100" 2>$null
$existingMs = $msJson | ConvertFrom-Json
$msMap = @{}

foreach ($m in $milestones) {
    $found = $existingMs | Where-Object { $_.title -eq $m.title }
    if ($found) {
        Write-Host "  - ya existe: $($m.title) (#$($found.number))" -ForegroundColor DarkGray
        $msMap[$m.title] = $found.number
    } else {
        $body = @{ title = $m.title; description = $m.desc }
        if ($m.due) { $body.due_on = $m.due }
        $tmp = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tmp, ($body | ConvertTo-Json))
        $resp = & $gh api "repos/$repo/milestones" --method POST --input $tmp
        if ($LASTEXITCODE -ne 0) { Remove-Item $tmp -Force; throw "Error creando milestone $($m.title)" }
        Remove-Item $tmp -Force
        $created = $resp | ConvertFrom-Json
        $msMap[$m.title] = $created.number
        Write-Host "  + creado: $($m.title) (#$($created.number))" -ForegroundColor Green
    }
}

# Guardamos el mapa para que el script de issues lo lea
$msMap | ConvertTo-Json | Set-Content "scripts\milestones-map.json" -Encoding UTF8
Write-Host "`nMapa de milestones guardado en scripts\milestones-map.json"
