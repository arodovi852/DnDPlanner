#requires -Version 5.1
# Reemplaza los bloques de placeholder de imagen en los docs cuando exista
# el archivo correspondiente en docs/assets/capturas-documentacion/.
#
# Formato del placeholder en cada doc:
#   > [emoji] **[IMAGEN|CAPTURA - Placeholder]** *alt text*
#   > Ruta sugerida: `docs/assets/XX-name.png`
#
# Reglas:
# - Si existe `docs/assets/capturas-documentacion/XX-name.png`, se sustituye
#   el bloque por `![alt](assets/capturas-documentacion/XX-name.png)`.
# - Si NO existe el archivo exacto pero existe `XX-name1.png`, se usa esa
#   (variante "principal" cuando hicieron falta dos imagenes para una idea).
# - Si ademas existe `XX-name2.png`, se inserta TAMBIEN tras la principal
#   (mismo alt) para que ambas aparezcan juntas y seguidas.
# - Si NO existe ninguna variante, el bloque se deja intacto.

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$docsDir  = Join-Path $repoRoot 'docs'
$capDir   = Join-Path $docsDir 'assets\capturas-documentacion'

$available = @{}
Get-ChildItem $capDir -File | ForEach-Object {
    $available[$_.Name.ToLower()] = $_.Name
}

# Devuelve un array con 1 o 2 nombres de archivo (en orden), o $null si no hay.
function Find-Match([string]$suggested) {
    $file = [System.IO.Path]::GetFileName($suggested).ToLower()
    $stem = [System.IO.Path]::GetFileNameWithoutExtension($file)
    $ext  = [System.IO.Path]::GetExtension($file)

    # 1) Match exacto.
    if ($available.ContainsKey($file)) {
        $result = @($available[$file])
        # Si existe variante 2, anadirla.
        $two = "$stem`2$ext".ToLower()
        if ($available.ContainsKey($two)) { $result += $available[$two] }
        return $result
    }

    # 2) Match con sufijo 1 (par 1 + 2).
    $one = "$stem`1$ext".ToLower()
    if ($available.ContainsKey($one)) {
        $result = @($available[$one])
        $two = "$stem`2$ext".ToLower()
        if ($available.ContainsKey($two)) { $result += $available[$two] }
        return $result
    }

    # 3) Otras variantes numericas (3, 4...) — devolver lo que haya.
    $result = @()
    foreach ($n in 1..6) {
        $candidate = "$stem$n$ext".ToLower()
        if ($available.ContainsKey($candidate)) { $result += $available[$candidate] }
    }
    if ($result.Count -gt 0) { return $result }

    return $null
}

$mdFiles = Get-ChildItem $docsDir -Filter '*.md' -File |
    Where-Object { $_.Name -ne 'GUIA_CAPTURAS.md' }

$totalReplaced = 0
$totalSkipped  = 0

$pattern = "(?m)^>\s*\S+\s*\*\*\[(?:IMAGEN|CAPTURA)\s+[-$([char]0x2014)]\s+Placeholder\]\*\*\s*\*([^*\r\n]+)\*\s*\r?\n>\s*Ruta sugerida:\s*``([^``]+)``"

foreach ($md in $mdFiles) {
    $text = [System.IO.File]::ReadAllText($md.FullName)
    $matches = [regex]::Matches($text, $pattern)
    if ($matches.Count -eq 0) {
        Write-Host ("{0,-32}  no placeholders" -f $md.Name)
        continue
    }

    $newText = $text
    $replacedInFile = 0
    $skippedInFile  = 0

    for ($i = $matches.Count - 1; $i -ge 0; $i--) {
        $m = $matches[$i]
        $alt  = $m.Groups[1].Value.Trim().TrimEnd('.')
        $sugg = $m.Groups[2].Value.Trim()
        $found = Find-Match $sugg
        if ($found) {
            $altEscaped = $alt -replace '\[', '(' -replace '\]', ')'
            $imageLines = @()
            foreach ($name in $found) {
                $rel = "assets/capturas-documentacion/$name"
                $imageLines += "![$altEscaped]($rel)"
            }
            $replacement = [string]::Join("`r`n`r`n", $imageLines)
            $newText = $newText.Substring(0, $m.Index) + $replacement + $newText.Substring($m.Index + $m.Length)
            $replacedInFile++
        } else {
            $skippedInFile++
        }
    }

    if ($newText -ne $text) {
        [System.IO.File]::WriteAllText($md.FullName, $newText, [System.Text.UTF8Encoding]::new($false))
    }

    $totalReplaced += $replacedInFile
    $totalSkipped  += $skippedInFile
    Write-Host ("{0,-32}  replaced={1,3}  skipped={2,3}" -f $md.Name, $replacedInFile, $skippedInFile)
}

Write-Host ""
Write-Host "TOTAL: replaced=$totalReplaced  skipped=$totalSkipped"
