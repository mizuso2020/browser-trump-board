@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   ブラウザ・トランプ＆ボード  Version 1
echo  ========================================
echo.

if not exist "%~dp0index.html" (
  echo エラー: この bat と同じフォルダに index.html がありません。
  echo ZIPを「すべて展開」してから実行してください。
  pause
  exit /b 1
)

if not exist "%~dp0scripts\local-server.ps1" (
  echo エラー: scripts\local-server.ps1 が見つかりません。
  echo ZIPが壊れている可能性があります。もう一度ダウンロードしてください。
  pause
  exit /b 1
)

echo ローカルサーバーを起動します（Python 不要）...
echo ブラウザが自動で開きます（http://localhost:29500/ など）
echo.
echo ※ この黒い画面は閉じないでください。閉じるとゲームが止まります。
echo ※ index.html を直接開くとボタンが効きません。必ずこの bat を使ってください。
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-server.ps1"

if errorlevel 1 (
  echo.
  echo 起動に失敗しました。
  pause
)
