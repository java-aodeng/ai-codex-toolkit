@echo off
setlocal
chcp 65001 >nul
where node.exe >nul 2>&1
if errorlevel 1 goto node_missing
node.exe "%~dp0src\cli.mjs" start %*
set "EXIT_CODE=%ERRORLEVEL%"
if "%EXIT_CODE%"=="0" exit /b 0
pause
exit /b %EXIT_CODE%

:node_missing
echo Node.js was not found in PATH.
pause
exit /b 1
