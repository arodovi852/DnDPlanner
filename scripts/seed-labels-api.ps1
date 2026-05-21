# Crea los labels via API REST directa (gh label create da falsos exitos).

$ErrorActionPreference = 'Stop'
$token = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$repo = "arodovi852/DnDPlanner"

$labels = @(
    @{ name = "tipo-feature";     color = "1f883d"; description = "Nueva funcionalidad" },
    @{ name = "tipo-bug";         color = "d73a4a"; description = "Fallo a corregir" },
    @{ name = "tipo-chore";       color = "c5def5"; description = "Tarea de mantenimiento" },
    @{ name = "tipo-docs";        color = "0075ca"; description = "Documentacion" },
    @{ name = "tipo-refactor";    color = "a371f7"; description = "Refactorizacion sin cambio funcional" },
    @{ name = "tipo-infra";       color = "5319e7"; description = "Infraestructura, CI/CD, despliegue" },
    @{ name = "area-frontend";    color = "61dafb"; description = "React, Vite, SCSS" },
    @{ name = "area-backend";     color = "3c873a"; description = "Express, Mongoose, Socket.IO" },
    @{ name = "area-bbdd";        color = "13aa52"; description = "MongoDB, esquemas, migraciones" },
    @{ name = "area-ui-ux";       color = "f9d0c4"; description = "Diseno visual y experiencia" },
    @{ name = "area-auth";        color = "fbca04"; description = "Autenticacion y autorizacion" },
    @{ name = "area-tiempo-real"; color = "0e8a16"; description = "Socket.IO, sincronizacion" },
    @{ name = "area-despliegue";  color = "8b008b"; description = "Docker, nginx, DigitalOcean" },
    @{ name = "area-i18n";        color = "ffcc99"; description = "Internacionalizacion ES/EN" },
    @{ name = "prioridad-alta";   color = "b60205"; description = "Bloquea otras tareas o es critica" },
    @{ name = "prioridad-media";  color = "fbca04"; description = "Importante pero no bloqueante" },
    @{ name = "prioridad-baja";   color = "0e8a16"; description = "Mejora deseable" }
)

# Listar existentes
$headers = @{ Authorization = "token $token"; "User-Agent" = "ps-script" }
$existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/labels?per_page=100" -Headers $headers
$existingNames = @($existing | ForEach-Object { $_.name })

Write-Host "Labels existentes: $($existingNames -join ', ')"
Write-Host ""

foreach ($l in $labels) {
    if ($existingNames -contains $l.name) {
        Write-Host "  - ya existe: $($l.name)" -ForegroundColor DarkGray
        continue
    }
    $body = $l | ConvertTo-Json -Compress
    try {
        $resp = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$repo/labels" -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "  + creado: $($l.name)" -ForegroundColor Green
    } catch {
        Write-Host "  ! ERROR creando $($l.name): $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            Write-Host "    Body: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "==> Verificacion final:"
$final = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/labels?per_page=100" -Headers $headers
$final | ForEach-Object { Write-Host "  $($_.name)" }
