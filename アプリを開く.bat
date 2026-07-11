@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo   ブラウザ・トランプ＆ボード  Version 1
echo  ========================================
echo.

if exist "%~dp0index.html" (
  echo OK: index.html を確認しました
) else (
  echo エラー: この bat と同じフォルダに index.html がありません。
  echo ZIPのままでは動きません。フォルダごと解凍してください。
  pause
  exit /b 1
)

where python >nul 2>&1
if %errorlevel%==0 (
  echo ローカルサーバーを起動します...
  echo ブラウザで http://localhost:8765/ を開きます
  echo 終了するにはこの黒い画面を閉じてください。
  echo.
  start "" "http://localhost:8765/"
  python -m http.server 8765
  exit /b 0
)

where py >nul 2>&1
if %errorlevel%==0 (
  echo ローカルサーバーを起動します...
  start "" "http://localhost:8765/"
  py -m http.server 8765
  exit /b 0
)

echo Python が見つかりません。
echo index.html を直接開きます（環境によっては動かない場合があります）
start "" "%~dp0index.html"
pause
