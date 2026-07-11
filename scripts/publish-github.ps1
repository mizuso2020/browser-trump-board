# GitHub 初回公開用（独自ドメイン・本格オンライン移行前のスナップショット）
# 事前: このフォルダで git commit 済みであること

$ErrorActionPreference = "Stop"
$git = "C:\Users\mizuso\tools\PortableGit\cmd\git.exe"
$gh = "C:\Users\mizuso\tools\gh\bin\gh.exe"
$repoName = "browser-trump-board"

Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $git)) {
  Write-Error "Portable Git が見つかりません: $git"
}
if (-not (Test-Path $gh)) {
  Write-Error "GitHub CLI が見つかりません: $gh"
}

Write-Host "=== GitHub ログイン確認 ===" -ForegroundColor Cyan
& $gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "ブラウザでログインしてください..." -ForegroundColor Yellow
  & $gh auth login -h github.com -p https -w
}

Write-Host "=== リポジトリ作成 & push ===" -ForegroundColor Cyan
& $gh repo create $repoName --public --source . --remote origin --description "ブラウザ・トランプ＆ボード — pre-online milestone (1-device games, EC2 deploy)" --push

Write-Host "完了: https://github.com/$( & $gh api user -q .login )/$repoName" -ForegroundColor Green
