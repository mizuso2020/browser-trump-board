param(
  [int]$Port = 29500
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$fallbackPorts = @($Port, 29501, 29502, 18765, 8088) | Select-Object -Unique

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
  ".md"   = "text/plain; charset=utf-8"
  ".xml"  = "application/xml; charset=utf-8"
  ".pdf"  = "application/pdf"
}

function Get-ContentType([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($mime.ContainsKey($ext)) { return $mime[$ext] }
  return "application/octet-stream"
}

$listener = $null
$activePort = $null
$lastError = $null

foreach ($tryPort in $fallbackPorts) {
  $candidate = New-Object System.Net.HttpListener
  $candidate.Prefixes.Add("http://127.0.0.1:$tryPort/")
  $candidate.Prefixes.Add("http://localhost:$tryPort/")
  try {
    $candidate.Start()
    $listener = $candidate
    $activePort = $tryPort
    break
  } catch {
    $lastError = $_.Exception.Message
    try { $candidate.Close() } catch {}
  }
}

if (-not $listener) {
  Write-Host ""
  Write-Host "FAILED to start local server."
  Write-Host $lastError
  Write-Host ""
  Write-Host "Close other apps using these ports, then try again."
  Write-Host ""
  exit 1
}

$url = "http://localhost:$activePort/"
$portFile = Join-Path $root ".server-port"
Set-Content -Path $portFile -Value $activePort -Encoding ascii

Write-Host ""
Write-Host "Browser Trump and Board - Version 1"
Write-Host "Open: $url"
Write-Host "Root: $root"
Write-Host "Close this window to stop."
Write-Host ""

Start-Process $url

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $rel = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($rel -eq "/") { $rel = "/index.html" }
    $rel = $rel.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
    $filePath = Join-Path $root $rel

    if (Test-Path $filePath -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($filePath)
      $response.StatusCode = 200
      $response.ContentType = Get-ContentType $filePath
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("Not Found")
      $response.ContentType = "text/plain; charset=utf-8"
      $response.ContentLength64 = $msg.Length
      $response.OutputStream.Write($msg, 0, $msg.Length)
    }

    $response.OutputStream.Close()
  }
} finally {
  try { $listener.Stop() } catch {}
  try { $listener.Close() } catch {}
  if (Test-Path $portFile) { Remove-Item $portFile -Force }
}
