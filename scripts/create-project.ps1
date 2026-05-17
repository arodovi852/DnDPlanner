# =============================================================================
# Crea un GitHub Project v2 "DnDPlanner - Roadmap PFG" y anade todos los
# issues del repositorio. Configura el campo Status para reflejar el estado
# real (Done si el issue esta cerrado, Todo si esta abierto).
#
# Usa la API GraphQL (Projects v2 no esta expuesto en REST).
# =============================================================================

$ErrorActionPreference = 'Continue'
$token = (Get-Content "C:\Users\rodri\.gh_token" -Raw).Trim()
$headers = @{
    Authorization  = "bearer $token"
    "User-Agent"   = "ps-script"
    "Content-Type" = "application/json"
}
$ownerLogin = "arodovi852"
$ownerId    = "U_kgDOCuBdzQ"
$repo       = "arodovi852/AROProyectoFinDeGrado2026"
$projectTitle = "DnDPlanner - Roadmap PFG"

function Invoke-GraphQL {
    param([string]$Query, [hashtable]$Variables)
    $payload = @{ query = $Query }
    if ($Variables) { $payload.variables = $Variables }
    $body = $payload | ConvertTo-Json -Depth 10 -Compress
    $resp = Invoke-RestMethod -Method Post -Uri "https://api.github.com/graphql" -Headers $headers -Body $body
    if ($resp.errors) {
        Write-Host "GraphQL errors:" -ForegroundColor Red
        $resp.errors | ForEach-Object { Write-Host "  - $($_.message)" -ForegroundColor Red }
        throw "GraphQL failed"
    }
    return $resp.data
}

# -----------------------------------------------------------------------------
# 1) Buscar si ya existe el project
# -----------------------------------------------------------------------------
Write-Host "==> Buscando project existente..." -ForegroundColor Cyan
$listData = Invoke-GraphQL -Query @"
query {
  user(login: "$ownerLogin") {
    projectsV2(first: 50) {
      nodes { id title number }
    }
  }
}
"@

$project = $listData.user.projectsV2.nodes | Where-Object { $_.title -eq $projectTitle } | Select-Object -First 1

if ($project) {
    Write-Host "  - ya existe: '$projectTitle' (#$($project.number)) id=$($project.id)" -ForegroundColor DarkGray
    $projectId = $project.id
    $projectNumber = $project.number
} else {
    Write-Host "==> Creando project '$projectTitle'..." -ForegroundColor Cyan
    $createData = Invoke-GraphQL -Query @"
mutation {
  createProjectV2(input: { ownerId: "$ownerId", title: "$projectTitle" }) {
    projectV2 { id number title }
  }
}
"@
    $projectId = $createData.createProjectV2.projectV2.id
    $projectNumber = $createData.createProjectV2.projectV2.number
    Write-Host "  + creado: #$projectNumber id=$projectId" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# 2) Obtener el campo Status y sus opciones (Todo, In Progress, Done)
# -----------------------------------------------------------------------------
Write-Host "`n==> Obteniendo campos del project..." -ForegroundColor Cyan
$fieldsData = Invoke-GraphQL -Query @"
query {
  node(id: "$projectId") {
    ... on ProjectV2 {
      fields(first: 30) {
        nodes {
          ... on ProjectV2FieldCommon { id name }
          ... on ProjectV2SingleSelectField {
            id name
            options { id name }
          }
        }
      }
    }
  }
}
"@
$statusField = $fieldsData.node.fields.nodes | Where-Object { $_.name -eq "Status" } | Select-Object -First 1
if (-not $statusField) { throw "Campo Status no encontrado" }
$statusFieldId = $statusField.id
$optTodo = ($statusField.options | Where-Object { $_.name -eq "Todo" }).id
$optInProgress = ($statusField.options | Where-Object { $_.name -eq "In Progress" }).id
$optDone = ($statusField.options | Where-Object { $_.name -eq "Done" }).id
Write-Host "  Status field id: $statusFieldId"
Write-Host "  Opciones: Todo=$optTodo, InProgress=$optInProgress, Done=$optDone"

# -----------------------------------------------------------------------------
# 3) Listar todos los issues del repo
# -----------------------------------------------------------------------------
Write-Host "`n==> Listando issues del repo..." -ForegroundColor Cyan
$repoIssues = @()
$cursor = $null
while ($true) {
    $afterClause = if ($cursor) { ", after: `"$cursor`"" } else { "" }
    $data = Invoke-GraphQL -Query @"
query {
  repository(owner: "arodovi852", name: "AROProyectoFinDeGrado2026") {
    issues(first: 100, states: [OPEN, CLOSED]$afterClause) {
      pageInfo { hasNextPage endCursor }
      nodes { id number title state }
    }
  }
}
"@
    $repoIssues += $data.repository.issues.nodes
    if (-not $data.repository.issues.pageInfo.hasNextPage) { break }
    $cursor = $data.repository.issues.pageInfo.endCursor
}
Write-Host "  Encontrados $($repoIssues.Count) issues"

# -----------------------------------------------------------------------------
# 4) Listar items que ya estan en el project para evitar duplicados
# -----------------------------------------------------------------------------
Write-Host "`n==> Listando items existentes en el project..." -ForegroundColor Cyan
$existingItemIssueIds = New-Object System.Collections.Generic.HashSet[string]
$itemByIssueId = @{}
$cursor = $null
while ($true) {
    $afterClause = if ($cursor) { ", after: `"$cursor`"" } else { "" }
    $data = Invoke-GraphQL -Query @"
query {
  node(id: "$projectId") {
    ... on ProjectV2 {
      items(first: 100$afterClause) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue { id number }
          }
        }
      }
    }
  }
}
"@
    foreach ($n in $data.node.items.nodes) {
        if ($n.content -and $n.content.id) {
            $null = $existingItemIssueIds.Add($n.content.id)
            $itemByIssueId[$n.content.id] = $n.id
        }
    }
    if (-not $data.node.items.pageInfo.hasNextPage) { break }
    $cursor = $data.node.items.pageInfo.endCursor
}
Write-Host "  Ya hay $($existingItemIssueIds.Count) issues en el project"

# -----------------------------------------------------------------------------
# 5) Anadir issues faltantes
# -----------------------------------------------------------------------------
Write-Host "`n==> Anadiendo issues al project..." -ForegroundColor Cyan
$added = 0
foreach ($issue in $repoIssues) {
    if ($existingItemIssueIds.Contains($issue.id)) {
        continue
    }
    $data = Invoke-GraphQL -Query @"
mutation {
  addProjectV2ItemById(input: { projectId: "$projectId", contentId: "$($issue.id)" }) {
    item { id }
  }
}
"@
    $itemId = $data.addProjectV2ItemById.item.id
    $itemByIssueId[$issue.id] = $itemId
    $added++
    Write-Host "  + #$($issue.number) anadido" -ForegroundColor Green
}
Write-Host "  Total anadidos: $added"

# -----------------------------------------------------------------------------
# 6) Setear Status: Done si CLOSED, Todo si OPEN
# -----------------------------------------------------------------------------
Write-Host "`n==> Asignando Status..." -ForegroundColor Cyan
$updated = 0
foreach ($issue in $repoIssues) {
    $itemId = $itemByIssueId[$issue.id]
    if (-not $itemId) { continue }
    $optId = if ($issue.state -eq "CLOSED") { $optDone } else { $optTodo }
    $data = Invoke-GraphQL -Query @"
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "$projectId",
    itemId: "$itemId",
    fieldId: "$statusFieldId",
    value: { singleSelectOptionId: "$optId" }
  }) { projectV2Item { id } }
}
"@
    $updated++
}
Write-Host "  Status actualizado en $updated items"

Write-Host "`n==> Hecho." -ForegroundColor Cyan
Write-Host "Project URL: https://github.com/users/$ownerLogin/projects/$projectNumber"
