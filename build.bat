@echo off

REM 安装依赖
echo Installing dependencies...
call npm install

REM 构建项目
echo Building project...
call npm run build

echo Build completed successfully!
pause
