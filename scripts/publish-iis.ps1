param(
  [Parameter(Mandatory = $true)]
  [string]$DestinationPath,

  [switch]$SkipBuild,

  [ValidateSet('local', 'internet')]
  [string]$BuildProfile = 'local',

  [ValidateRange(1, 365)]
  [int]$RetainDays = 14
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'dist\angularv20\browser'

if (-not $SkipBuild) {
  Push-Location $projectRoot
  try {
    & npm.cmd run "build:$BuildProfile"
    if ($LASTEXITCODE -ne 0) {
      throw "Build basarisiz oldu. Cikis kodu: $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
  throw "Yayin kaynagi bulunamadi: $sourcePath"
}

$distWebConfig = Join-Path $sourcePath 'web.config'
if (-not (Test-Path -LiteralPath $distWebConfig -PathType Leaf)) {
  throw "Yayin web.config dosyasi bulunamadi: $distWebConfig"
}

$hasApiReverseProxy = Select-String `
  -LiteralPath $distWebConfig `
  -SimpleMatch 'Furpa API Reverse Proxy' `
  -Quiet
$detectedBuildProfile = if ($hasApiReverseProxy) { 'internet' } else { 'local' }

if ($detectedBuildProfile -ne $BuildProfile) {
  throw "Dist profili '$detectedBuildProfile', istenen yayin profili '$BuildProfile'. Dogru profille yeniden build alin."
}

if (-not (Test-Path -LiteralPath $DestinationPath)) {
  New-Item -ItemType Directory -Path $DestinationPath | Out-Null
}

$resolvedSource = (Resolve-Path -LiteralPath $sourcePath).Path.TrimEnd('\')
$resolvedDestination = (Resolve-Path -LiteralPath $DestinationPath).Path.TrimEnd('\')

if ($resolvedSource -eq $resolvedDestination) {
  throw 'Kaynak ve hedef klasor ayni olamaz.'
}

$sourcePrefix = "$resolvedSource\"
$files = Get-ChildItem -LiteralPath $resolvedSource -Recurse -File

# Hashli uygulama dosyalari once kopyalanir. Eski chunk dosyalari acik oturumlar
# icin korunur; index.html en son degistirilerek yarim yayin riski engellenir.
foreach ($file in $files | Where-Object { $_.Name -ne 'index.html' }) {
  $relativePath = $file.FullName.Substring($sourcePrefix.Length)
  $targetFile = Join-Path $resolvedDestination $relativePath
  $targetDirectory = Split-Path -Parent $targetFile

  if (-not (Test-Path -LiteralPath $targetDirectory)) {
    New-Item -ItemType Directory -Path $targetDirectory -Force | Out-Null
  }

  Copy-Item -LiteralPath $file.FullName -Destination $targetFile -Force
}

$indexSource = Join-Path $resolvedSource 'index.html'
$indexDestination = Join-Path $resolvedDestination 'index.html'

if (-not (Test-Path -LiteralPath $indexSource -PathType Leaf)) {
  throw "index.html bulunamadi: $indexSource"
}

Copy-Item -LiteralPath $indexSource -Destination $indexDestination -Force

$currentRootFiles = [System.Collections.Generic.HashSet[string]]::new(
  [System.StringComparer]::OrdinalIgnoreCase
)

Get-ChildItem -LiteralPath $resolvedSource -File | ForEach-Object {
  [void]$currentRootFiles.Add($_.Name)
}

$retentionThreshold = (Get-Date).AddDays(-$RetainDays)
$versionedBundlePattern = '^(?:main|polyfills|styles|chunk)-[A-Za-z0-9]+\.(?:js|css)$'
$removedBundleCount = 0

Get-ChildItem -LiteralPath $resolvedDestination -File | Where-Object {
  [regex]::IsMatch($_.Name, $versionedBundlePattern) -and
  -not $currentRootFiles.Contains($_.Name) -and
  $_.LastWriteTime -lt $retentionThreshold
} | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Force
  $removedBundleCount += 1
}

Write-Host "IIS yayini tamamlandi: $resolvedDestination"
Write-Host "Yayin profili: $BuildProfile"
Write-Host "Eski hashli dosyalar $RetainDays gun boyunca acik kullanici oturumlari icin korunur."
Write-Host "$removedBundleCount adet suresi dolmus bundle temizlendi."
